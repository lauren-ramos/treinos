import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth as useClerkAuth, useUser } from '@clerk/react'
import { bridge, clerkConfigured, supabase, supaConfigured } from './supabase'
import { pendingCount, wipeAll } from './db'
import { syncNow } from './sync'

export interface AuthUser { id: string; email: string }

interface AuthState {
  ready: boolean
  user: AuthUser | null
  configured: boolean
  localMode: boolean
  useLocal: () => void
  signOut: () => Promise<{ ok: boolean; pending: number }>
}

const Ctx = createContext<AuthState>({ ready: true, user: null, configured: false, localMode: true, useLocal() {}, signOut: async () => ({ ok: true, pending: 0 }) })
export const useAuth = () => useContext(Ctx)

const LOCAL_KEY = 'meu-treino:local-mode'
const readLocal = () => { try { return localStorage.getItem(LOCAL_KEY) === '1' } catch { return false } }

function useLocalFlag() {
  const [localMode, setLocal] = useState(readLocal)
  const useLocal = useCallback(() => {
    try { localStorage.setItem(LOCAL_KEY, '1') } catch { /* ignora */ }
    setLocal(true)
  }, [])
  const clear = useCallback(() => { try { localStorage.removeItem(LOCAL_KEY) } catch { /* ignora */ } setLocal(false) }, [])
  return { localMode, useLocal, clear }
}

/** Login com o Clerk; o token de sessão do Clerk autentica as chamadas ao Supabase (RLS pelo id do Clerk). */
function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken, signOut: clerkSignOut } = useClerkAuth()
  const { user } = useUser()
  const { localMode, useLocal, clear } = useLocalFlag()
  // a ponte precisa estar pronta antes de qualquer sincronização
  bridge.getToken = () => getToken()
  bridge.userId = isSignedIn && userId ? userId : null
  useEffect(() => { if (isLoaded) void syncNow() }, [isLoaded, isSignedIn, userId])

  const signOut = useCallback(async () => {
    await syncNow()
    const pending = await pendingCount()
    if (pending > 0) return { ok: false, pending }
    await clerkSignOut()
    await wipeAll() // os dados já estão no servidor; limpa o aparelho para o próximo usuário
    bridge.userId = null
    clear()
    return { ok: true, pending: 0 }
  }, [clerkSignOut, clear])

  const u: AuthUser | null = isSignedIn && userId ? { id: userId, email: user?.primaryEmailAddress?.emailAddress ?? '' } : null
  return <Ctx.Provider value={{ ready: isLoaded, user: u, configured: true, localMode, useLocal, signOut }}>{children}</Ctx.Provider>
}

/** Login nativo do Supabase (e-mail e senha), usado só quando o Clerk não está configurado. */
function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supaConfigured)
  const [user, setUser] = useState<AuthUser | null>(null)
  const { localMode, useLocal, clear } = useLocalFlag()

  useEffect(() => {
    if (!supabase) return
    let alive = true
    const map = (u: { id: string; email?: string } | null | undefined) => (u ? { id: u.id, email: u.email ?? '' } : null)
    supabase.auth.getSession().then(({ data }) => { if (alive) { setUser(map(data.session?.user)); setReady(true) } })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(map(session?.user)))
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const signOut = useCallback(async () => {
    await syncNow()
    const pending = await pendingCount()
    if (pending > 0) return { ok: false, pending }
    await supabase?.auth.signOut()
    await wipeAll()
    clear()
    return { ok: true, pending: 0 }
  }, [clear])

  return <Ctx.Provider value={{ ready, user, configured: supaConfigured, localMode, useLocal, signOut }}>{children}</Ctx.Provider>
}

export const AuthProvider = clerkConfigured ? ClerkAuthProvider : SupabaseAuthProvider
