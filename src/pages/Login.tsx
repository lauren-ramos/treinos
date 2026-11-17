import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Field, Icon } from '../components/ui'

export default function Login() {
  const { useLocal } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: string; err: boolean } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: pass })
        if (error) throw error
        if (!data.session) setMsg({ t: 'Conta criada! Confirme o e-mail que enviamos e depois entre.', err: false })
      }
    } catch (err) {
      const m = String((err as Error).message ?? err)
      setMsg({ t: /invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /fetch|network/i.test(m) ? 'Sem conexão. Você pode usar o app sem conta e entrar depois.' : m, err: true })
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-dvh grid place-items-center px-5 py-10 safe-t safe-b">
      <div className="w-full max-w-sm page-in">
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-[20px] bg-accent text-onaccent mx-auto grid place-items-center shadow-lg"><Icon n="dumbbell" size={32} /></div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-4">Meu Treino</h1>
          <p className="text-muted text-sm mt-1">Planeje, treine e acompanhe sua evolução.</p>
        </div>
        <form onSubmit={submit} className="card p-5 space-y-4">
          <div className="seg w-full [&>button]:flex-1">
            <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Entrar</button>
            <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Criar conta</button>
          </div>
          <Field label="E-mail"><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Senha" hint={mode === 'up' ? 'Mínimo de 6 caracteres.' : undefined}><input className="input" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} /></Field>
          {msg && <p className={`text-sm font-semibold ${msg.err ? 'text-danger' : 'text-ok'}`} role="alert">{msg.t}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <button className="btn w-full mt-3" onClick={useLocal}>Usar sem conta (dados só neste aparelho)</button>
        <p className="text-xs text-muted text-center mt-3">Com conta, seus treinos são sincronizados entre aparelhos e ficam salvos na nuvem.</p>
      </div>
    </div>
  )
}
