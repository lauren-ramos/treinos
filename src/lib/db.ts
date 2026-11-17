import Dexie, { type Table } from 'dexie'
import type {
  Achievement, CustomExercise, Goal, PlannedItem, PlannedWorkout, Profile, Row,
  Session, SessionExercise, SessionSet, Video,
} from './types'
import { uid } from './id'

export interface Meta { key: string; value: unknown }

class AppDB extends Dexie {
  profiles!: Table<Profile, string>
  custom_exercises!: Table<CustomExercise, string>
  planned_workouts!: Table<PlannedWorkout, string>
  planned_items!: Table<PlannedItem, string>
  sessions!: Table<Session, string>
  session_exercises!: Table<SessionExercise, string>
  session_sets!: Table<SessionSet, string>
  goals!: Table<Goal, string>
  achievements!: Table<Achievement, string>
  videos!: Table<Video, string>
  meta!: Table<Meta, string>

  constructor(name = 'meu-treino') {
    super(name)
    this.version(1).stores({
      profiles: 'id, _d',
      custom_exercises: 'id, _d',
      planned_workouts: 'id, date, template, _d',
      planned_items: 'id, workout_id, _d',
      sessions: 'id, status, date, _d',
      session_exercises: 'id, session_id, _d',
      session_sets: 'id, session_id, session_exercise_id, exercise_id, _d',
      goals: 'id, _d',
      achievements: 'id, key, _d',
      videos: 'id, _d',
      meta: 'key',
    })
  }
}

export const db = new AppDB()

/** Tabelas sincronizadas com o Supabase (mesmos nomes e colunas). */
export const SYNC_TABLES = [
  'profiles', 'custom_exercises', 'planned_workouts', 'planned_items',
  'sessions', 'session_exercises', 'session_sets', 'goals', 'achievements', 'videos',
] as const
export type SyncTable = (typeof SYNC_TABLES)[number]

let writeListener: (() => void) | null = null
export function onLocalWrite(fn: () => void) { writeListener = fn }
function wrote() { writeListener?.() }

export const nowIso = () => new Date().toISOString()

/** Cria ou atualiza uma linha, carimbando updated_at e marcando como pendente de envio. */
export async function put<T extends Row>(table: Table<T, string>, row: Partial<T> & { id?: string }, base?: T): Promise<T> {
  const existing = base ?? (row.id ? await table.get(row.id) : undefined)
  const merged = { ...(existing ?? {}), ...row, id: row.id ?? existing?.id ?? uid(), updated_at: nowIso(), _d: 1 } as T
  await table.put(merged)
  wrote()
  return merged
}

export async function putMany<T extends Row>(table: Table<T, string>, rows: (Partial<T> & { id?: string })[]): Promise<T[]> {
  const stamp = nowIso()
  const out = rows.map((r) => ({ ...r, id: r.id ?? uid(), updated_at: stamp, _d: 1 }) as T)
  await table.bulkPut(out)
  wrote()
  return out
}

/** Exclusão lógica: a linha continua local (e é enviada) para que a exclusão chegue aos outros aparelhos. */
export async function softDelete<T extends Row>(table: Table<T, string>, id: string): Promise<void> {
  const r = await table.get(id)
  if (!r) return
  await table.put({ ...r, deleted: true, updated_at: nowIso(), _d: 1 })
  wrote()
}

export async function softDeleteRows<T extends Row>(table: Table<T, string>, rows: T[]): Promise<void> {
  if (!rows.length) return
  const stamp = nowIso()
  await table.bulkPut(rows.map((r) => ({ ...r, deleted: true, updated_at: stamp, _d: 1 }) as T))
  wrote()
}

export const alive = <T extends Row>(rows: T[]): T[] => rows.filter((r) => !r.deleted)

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}
export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value })
}

export async function pendingCount(): Promise<number> {
  let n = 0
  for (const t of SYNC_TABLES) n += await (db[t] as Table<Row, string>).where('_d').equals(1).count()
  return n
}

export async function wipeAll() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}

/* ---------------- perfil ---------------- */
export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  updated_at: '1970-01-01T00:00:00.000Z',
  name: '',
  photo: '',
  goal_text: '',
  preferred_location: 'ambos',
  available_days: [1, 3, 5],
  theme: 'system',
  default_rest: 60,
  auto_rest: true,
  sound: true,
  vibrate: true,
  notifications: false,
  keep_awake: true,
  onboarded: false,
}

export async function getProfile(): Promise<Profile> {
  return (await db.profiles.get('me')) ?? DEFAULT_PROFILE
}
export async function saveProfile(patch: Partial<Profile>) {
  const cur = await getProfile()
  return put(db.profiles, { ...patch, id: 'me' }, cur)
}
