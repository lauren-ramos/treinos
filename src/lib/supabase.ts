import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Sem as variáveis de ambiente o app roda 100% local (dados no aparelho). */
export const supaConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'))

export const supabase: SupabaseClient | null = supaConfigured
  ? createClient(url as string, key as string, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
