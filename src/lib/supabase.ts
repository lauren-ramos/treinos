import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Sem as variáveis de ambiente o app roda 100% local (dados no aparelho). */
export const supaConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'))

/** Login pelo Clerk (mesmo padrão do Plano CIAAR): o token do Clerk vale como login no Supabase. */
export const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
export const clerkConfigured = Boolean(clerkKey && !clerkKey.includes('SUA-CHAVE'))

/** Ponte preenchida pelo provedor de login do Clerk (ver lib/auth.tsx). */
export const bridge: { getToken: () => Promise<string | null>; userId: string | null } = { getToken: async () => null, userId: null }

export const supabase: SupabaseClient | null = supaConfigured
  ? createClient(
      url as string,
      key as string,
      clerkConfigured
        ? { accessToken: () => bridge.getToken() }
        : { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    )
  : null
