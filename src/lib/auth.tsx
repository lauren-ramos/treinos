import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supaConfigured } from './supabase'
import { pendingCount, wipeAll } from './db'
import { syncNow } from './sync'

interface AuthState {
  ready: boolean
  user: User | null
  configured: boolean
  localMode: boolean
  useLocal: () => void
  signOut: () => Promise<{ ok: boolean; pending: number }>
}

const Ctx = createContext<AuthState>({ ready: true, user: null, configured: false, localMode: true, useLocal() {}, signOut: async () => ({ ok: true, pending: 0 }) })
export const useAuth = () => useContext(Ctx)

const LOCAL_KEY = 'meu-treino:local-mode'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supaConfigured)
  const [user, setUser] = useState<User | null>(null)
  const [localMode, setLocal] = useState(() => {
    try { return localStorage.getItem(LOCAL_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) { setUser(data.session?.user ?? null); setReady(true) } })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const useLocal = useCallback(() => {
    try { localStorage.setItem(LOCAL_KEY, '1') } catch { /* ignora */ }
    setLocal(true)
  }, [])

  const signOut = useCallback(async () => {
    await syncNow()
    const pending = await pendingCount()
    if (pending > 0) return { ok: false, pending }
    await supabase?.auth.signOut()
    await wipeAll() // os dados já estão no servidor; limpa o aparelho para o próximo usuário
    try { localStorage.removeItem(LOCAL_KEY) } catch { /* ignora */ }
    setLocal(false)
    return { ok: true, pending: 0 }
  }, [])

  return <Ctx.Provider value={{ ready, user, configured: supaConfigured, localMode, useLocal, signOut }}>{children}</Ctx.Provider>
}
