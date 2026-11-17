import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Field, Icon, Modal, useConfirm, useToast } from './ui'
import { SyncBadge } from './SyncBadge'
import { db, saveProfile } from '../lib/db'
import { discardSession, elapsedMs, finishSession, getActiveSession, getSessionExercises } from '../lib/session'
import { fmtDur, DIAS_CURTOS } from '../lib/dates'
import { checkAchievements } from '../lib/stats'

const NAV = [
  { to: '/', icon: 'home', label: 'Início' },
  { to: '/plano', icon: 'list', label: 'Planejamento' },
  { to: '/treinos', icon: 'dumbbell', label: 'Treinos' },
  { to: '/calendario', icon: 'calendar', label: 'Calendário' },
  { to: '/historico', icon: 'chart', label: 'Histórico' },
  { to: '/perfil', icon: 'user', label: 'Perfil' },
] as const

function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return n
}

export default function Layout() {
  const loc = useLocation()
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const active = useLiveQuery(() => getActiveSession(), [], undefined)
  const profile = useLiveQuery(async () => (await db.profiles.get('me')) ?? null, [], undefined)
  const allDone = useLiveQuery(async () => {
    const a = await getActiveSession()
    if (!a) return false
    const ex = await getSessionExercises(a.id)
    return ex.length > 0 && ex.every((e) => e.status !== 'pending')
  }, [], false)
  const now = useNow()
  const [asked, setAsked] = useState(false)

  // Pergunta, uma vez por abertura do app, se quer continuar o treino em andamento.
  const showResume = !!active && !asked && !loc.pathname.startsWith('/treino/')
  const [onb, setOnb] = useState(false)
  useEffect(() => { if (profile !== undefined && !profile?.onboarded) setOnb(true) }, [profile])

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden md:flex flex-col w-64 shrink-0 sticky top-0 h-dvh border-r border-line bg-surface p-5 gap-1">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-10 h-10 rounded-xl bg-accent text-onaccent grid place-items-center"><Icon n="dumbbell" /></div>
          <b className="text-lg font-extrabold tracking-tight">Meu Treino</b>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-[15px] transition ${isActive ? 'bg-accentsoft text-accentink' : 'text-muted hover:bg-surface2'}`}>
            <Icon n={n.icon} size={20} />{n.label}
          </NavLink>
        ))}
        <div className="mt-auto"><SyncBadge full /></div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-bg/90 backdrop-blur safe-t border-b border-line">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-accent text-onaccent grid place-items-center"><Icon n="dumbbell" size={18} /></div><b className="font-extrabold tracking-tight">Meu Treino</b></div>
          <SyncBadge />
        </header>
        <main className="max-w-5xl mx-auto px-4 md:px-8 pt-5 pb-36 md:pb-12 page-in" key={loc.pathname}>
          <Outlet />
        </main>
      </div>

      {active && !loc.pathname.startsWith('/treino/') && (
        <button onClick={() => nav(`/treino/${active.id}`)} className="fixed z-40 left-3 right-3 bottom-[76px] md:left-auto md:right-6 md:bottom-6 md:w-80 rounded-2xl bg-accent text-onaccent px-4 py-3 flex items-center gap-3 shadow-xl text-left" aria-label="Voltar ao treino em andamento">
          <Icon n={active.status === 'paused' ? 'pause' : 'play'} />
          <span className="flex-1 min-w-0"><b className="block text-sm leading-tight truncate">{active.name}</b><span className="text-xs opacity-90 tnum">{active.status === 'paused' ? 'Pausado' : 'Em andamento'} · {fmtDur(elapsedMs(active, now) / 1000)}</span></span>
          <Icon n="chevR" />
        </button>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-line safe-b" aria-label="Navegação principal">
        <div className="grid grid-cols-6">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-bold ${isActive ? 'text-accentink' : 'text-muted'}`}>
              {({ isActive }) => (<><span className={`px-3.5 py-1 rounded-full transition ${isActive ? 'bg-accentsoft' : ''}`}><Icon n={n.icon} size={21} /></span>{n.label === 'Planejamento' ? 'Plano' : n.label}</>)}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* treino em andamento: retomar */}
      <Modal open={showResume} onClose={() => setAsked(true)} title="Treino em andamento">
        {active && (
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed">Você tem um treino em andamento. Deseja continuar de onde parou?</p>
            <div className="card-flat p-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accentsoft text-accentink grid place-items-center"><Icon n="clock" /></div>
              <div><b>{active.name}</b><div className="text-sm text-muted tnum">{active.status === 'paused' ? 'Pausado' : 'Em andamento'} · {fmtDur(elapsedMs(active, now) / 1000)} de treino</div></div>
            </div>
            <div className="grid gap-2">
              <button className="btn btn-primary" onClick={() => { setAsked(true); nav(`/treino/${active.id}`) }}><Icon n="play" />Continuar treino</button>
              {allDone && <button className="btn" onClick={async () => { await finishSession(active.id); setAsked(true); const n = await checkAchievements(); nav(`/treino/${active.id}`); if (n.length) toast(`Conquista: ${n[0].title}!`) }}><Icon n="flag" />Finalizar treino</button>}
              <button className="btn btn-danger" onClick={async () => {
                if (await confirm({ title: 'Descartar treino?', text: 'As séries registradas neste treino em andamento serão descartadas e não entrarão no histórico.', ok: 'Descartar', danger: true })) { await discardSession(active.id); setAsked(true); toast('Treino descartado.', 'info') }
              }}><Icon n="trash" />Descartar treino</button>
            </div>
          </div>
        )}
      </Modal>
      <Onboarding open={onb} onClose={() => setOnb(false)} />
    </div>
  )
}

function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [loc, setLoc] = useState<'academia' | 'casa' | 'ambos'>('ambos')
  async function go() {
    await saveProfile({ name: name.trim(), available_days: days, preferred_location: loc, onboarded: true })
    onClose()
  }
  return (
    <Modal open={open} onClose={go} title="Bem-vinda ao Meu Treino" footer={<button className="btn btn-primary w-full" onClick={go}>Começar</button>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Algumas perguntas rápidas para personalizar. Você pode mudar tudo depois em Perfil.</p>
        <Field label="Como quer ser chamado(a)?"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoFocus /></Field>
        <div>
          <span className="label">Onde você treina?</span>
          <div className="seg">{(['academia', 'casa', 'ambos'] as const).map((x) => <button key={x} className={loc === x ? 'on' : ''} onClick={() => setLoc(x)}>{x === 'ambos' ? 'Os dois' : x === 'casa' ? 'Em casa' : 'Academia'}</button>)}</div>
        </div>
        <div>
          <span className="label">Dias disponíveis</span>
          <div className="flex gap-1.5 flex-wrap">{DIAS_CURTOS.map((d, i) => <button key={d} className={`chip ${days.includes(i) ? 'on' : ''}`} onClick={() => setDays((x) => (x.includes(i) ? x.filter((k) => k !== i) : [...x, i]))}>{d}</button>)}</div>
        </div>
      </div>
    </Modal>
  )
}
