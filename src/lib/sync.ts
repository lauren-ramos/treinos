/**
 * Sincronização local-first com o Supabase.
 *  - Toda alteração é gravada primeiro no IndexedDB (marcada com _d = 1).
 *  - O envio é idempotente: cada linha tem um UUID gerado no aparelho e usa upsert por id, então
 *    reenviar nunca duplica treinos.
 *  - Conflitos: vence o registro com updated_at mais recente (o servidor também recusa gravações mais antigas).
 *  - A exclusão é lógica (deleted = true) para que chegue a todos os aparelhos.
 */
import { useSyncExternalStore } from 'react'
import type { Table } from 'dexie'
import { db, SYNC_TABLES, getMeta, setMeta, pendingCount, onLocalWrite, type SyncTable } from './db'
import { supabase, supaConfigured, clerkConfigured, bridge } from './supabase'
import type { Row } from './types'

export type SyncStatus = 'local' | 'online' | 'offline' | 'syncing' | 'error'
export interface SyncState { status: SyncStatus; pending: number; lastSync: string | null; error: string | null; signedIn: boolean }

let state: SyncState = { status: supaConfigured ? 'offline' : 'local', pending: 0, lastSync: null, error: null, signedIn: false }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
function set(p: Partial<SyncState>) { state = { ...state, ...p }; emit() }
export const getSyncState = () => state
export function useSyncState(): SyncState {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)
}

const BATCH = 200
let running = false
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

async function userId(): Promise<string | null> {
  if (!supabase) return null
  if (clerkConfigured) return bridge.userId
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function refreshPending() {
  set({ pending: await pendingCount() })
}

const isNetworkError = (e: unknown) => {
  const m = String((e as { message?: string })?.message ?? e).toLowerCase()
  return m.includes('failed to fetch') || m.includes('network') || m.includes('load failed') || m.includes('fetch')
}

function toRemote(t: SyncTable, r: Row, uid: string): Record<string, unknown> {
  const { _d, ...rest } = r as Row & Record<string, unknown>
  void _d
  return { ...rest, id: t === 'profiles' ? uid : r.id, user_id: uid }
}

async function push(uid: string) {
  for (const t of SYNC_TABLES) {
    const table = db[t] as unknown as Table<Row, string>
    for (;;) {
      const rows = await table.where('_d').equals(1).limit(BATCH).toArray()
      if (!rows.length) break
      const { error } = await supabase!.from(t).upsert(rows.map((r) => toRemote(t, r, uid)), { onConflict: 'id' })
      if (error) throw error
      // só limpa a marca se a linha não foi alterada de novo durante o envio
      await db.transaction('rw', table, async () => {
        for (const r of rows) {
          const cur = await table.get(r.id)
          if (cur && cur.updated_at === r.updated_at) await table.put({ ...cur, _d: 0 })
        }
      })
      if (rows.length < BATCH) break
    }
  }
}

async function pull(uid: string) {
  for (const t of SYNC_TABLES) {
    const table = db[t] as unknown as Table<Row, string>
    let cursor = (await getMeta<string>(`cursor:${t}`)) ?? '1970-01-01T00:00:00Z'
    for (;;) {
      const { data, error } = await supabase!.from(t).select('*').gt('synced_at', cursor).order('synced_at', { ascending: true }).limit(1000)
      if (error) throw error
      if (!data?.length) break
      await db.transaction('rw', table, async () => {
        for (const raw of data as Record<string, unknown>[]) {
          const { synced_at, user_id, ...rest } = raw
          void synced_at; void user_id
          const row = { ...rest, id: t === 'profiles' ? 'me' : (rest.id as string), _d: 0 } as unknown as Row
          const local = await table.get(row.id)
          // o mais recente vence; alteração local pendente mais nova não é sobrescrita
          if (!local || row.updated_at > local.updated_at) await table.put(row)
        }
      })
      cursor = String((data[data.length - 1] as Record<string, unknown>).synced_at)
      await setMeta(`cursor:${t}`, cursor)
      if (data.length < 1000) break
    }
  }
}

export async function syncNow(): Promise<void> {
  if (!supabase) { await refreshPending(); set({ status: 'local' }); return }
  if (running) { again = true; return }
  const uid = await userId()
  if (!uid) { await refreshPending(); set({ status: 'local', signedIn: false }); return }
  if (typeof navigator !== 'undefined' && !navigator.onLine) { await refreshPending(); set({ status: 'offline', signedIn: true }); return }
  running = true
  set({ status: 'syncing', signedIn: true, error: null })
  try {
    await push(uid)
    await pull(uid)
    const pending = await pendingCount()
    set({ status: pending > 0 ? 'error' : 'online', pending, lastSync: new Date().toISOString(), error: pending > 0 ? 'Algumas alterações ainda não foram enviadas.' : null })
  } catch (e) {
    const pending = await pendingCount()
    if (isNetworkError(e)) set({ status: 'offline', pending, error: null })
    else set({ status: 'error', pending, error: String((e as { message?: string })?.message ?? e) })
  } finally {
    running = false
    if (again) { again = false; scheduleSync(500) }
  }
}

export function scheduleSync(delay = 1500) {
  clearTimeout(timer)
  void refreshPending()
  timer = setTimeout(() => void syncNow(), delay)
}

let started = false
export function startSync() {
  if (started) return
  started = true
  onLocalWrite(() => scheduleSync())
  window.addEventListener('online', () => void syncNow())
  window.addEventListener('offline', () => void refreshPending().then(() => set({ status: supaConfigured ? 'offline' : 'local' })))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void syncNow() })
  setInterval(() => { if (document.visibilityState === 'visible') void syncNow() }, 45000)
  if (!clerkConfigured) supabase?.auth.onAuthStateChange(() => void syncNow())
  void syncNow()
}
