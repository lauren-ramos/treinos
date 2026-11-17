import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, Spinner, useToast } from '../components/ui'
import { ExThumb } from '../components/exercise'
import { getProfile } from '../lib/db'
import { DIAS_CURTOS, fmtDay, fmtDur, fmtDurLong, todayKey, weekDays } from '../lib/dates'
import { itemsOf, createWorkout } from '../lib/plan'
import { elapsedMs, startSession } from '../lib/session'
import { LIB_BY_ID } from '../data/library'
import { dayState, durSec, goalProgress, plannedInWeek, streak, useAppData, weekCount } from '../lib/stats'
import { useInstall } from '../lib/pwa'

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

/** Estimativa de duração: ~40 s por série + descanso. */
const estMinutes = (items: { sets: number; rest: number; unit: string; reps: string }[]) =>
  Math.max(5, Math.round(items.reduce((a, i) => a + i.sets * ((i.unit === 'seg' ? parseInt(i.reps, 10) || 30 : 40) + i.rest), 0) / 60))

export default function Dashboard() {
  const nav = useNavigate()
  const toast = useToast()
  const d = useAppData()
  const profile = useLiveQuery(() => getProfile(), [], undefined)
  const today = todayKey()
  const todays = useMemo(() => d.workouts.filter((w) => w.date === today && !w.cancelled), [d.workouts, today])
  const items = useLiveQuery(async () => {
    const out: Record<string, Awaited<ReturnType<typeof itemsOf>>> = {}
    for (const w of todays) out[w.id] = await itemsOf(w.id)
    return out
  }, [todays], {} as Record<string, Awaited<ReturnType<typeof itemsOf>>>)
  const next = useMemo(() => d.workouts.filter((w) => w.date && w.date > today && !w.cancelled).sort((a, b) => (a.date! < b.date! ? -1 : 1))[0], [d.workouts, today])
  const nextItems = useLiveQuery(async () => (next ? (await itemsOf(next.id)).length : 0), [next?.id], 0)
  const install = useInstall()
  const [now, setNow] = useState(Date.now())
  useEffect(() => { if (!d.active) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [d.active])

  if (!d.ready || profile === undefined) return <Spinner />

  const wk = weekCount(today, d)
  const planned = plannedInWeek(today, d)
  const goalTarget = planned || profile.available_days.length || 3
  const last5 = d.sessions.slice(-5)
  const lastTotal = last5.reduce((a, s) => a + durSec(s), 0)
  const st = streak(d)
  const activeGoals = d.goals.filter((g) => g.active).map((g) => goalProgress(g, d))
  const doneToday = d.sessions.filter((s) => s.date === today)
  const first = (profile.name || '').trim().split(' ')[0]

  async function start(workoutId: string | null) {
    try {
      const s = await startSession({ plannedWorkoutId: workoutId })
      nav(`/treino/${s.id}`)
    } catch {
      toast('Você já tem um treino em andamento.', 'err')
      if (d.active) nav(`/treino/${d.active.id}`)
    }
  }
  async function planToday() {
    const w = await createWorkout(today, { name: 'Treino de hoje', location: profile!.preferred_location === 'casa' ? 'casa' : 'academia' })
    nav(`/plano?w=${w.id}`)
  }

  return (
    <div className="space-y-5">
      {/* saudação */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="h-eyebrow">{fmtDay(today)}</div>
          <h1 className="text-[30px] leading-[34px] font-extrabold tracking-tight mt-0.5">{hello()}{first ? `, ${first}` : ''}</h1>
        </div>
        <Link to="/perfil" aria-label="Abrir perfil" className="w-12 h-12 rounded-2xl overflow-hidden grid place-items-center bg-accentsoft text-accentink font-extrabold text-lg shrink-0 ring-2 ring-surface shadow">
          {profile.photo ? <img src={profile.photo} alt="" className="w-full h-full object-cover" /> : (first ? first[0].toUpperCase() : <Icon n="user" />)}
        </Link>
      </header>

      {(install.canPrompt || install.ios) && !install.installed && (
        <div className="card-flat p-3 flex items-center gap-3">
          <div className="tile-ic bg-accentsoft text-accentink shrink-0"><Icon n="download" size={18} /></div>
          <div className="flex-1 text-sm min-w-0"><b>Instale o app no celular</b><div className="text-muted text-xs">{install.ios ? 'No Safari: Compartilhar → Adicionar à Tela de Início.' : 'Tela cheia e acesso offline.'}</div></div>
          {install.canPrompt && <button className="btn btn-soft btn-sm" onClick={install.install}>Instalar</button>}
        </div>
      )}

      {/* treino de hoje */}
      {d.active ? (
        <section className="hero p-5" aria-label="Treino em andamento">
          <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[.14em] opacity-90"><i className="w-2 h-2 rounded-full bg-white animate-pulse" />EM ANDAMENTO</div>
          <h2 className="text-[26px] leading-8 font-extrabold tracking-tight mt-1.5">{d.active.name}</h2>
          <div className="text-[44px] leading-none font-extrabold tnum mt-3">{fmtDur(elapsedMs(d.active, now) / 1000)}</div>
          <button className="btn w-full mt-5 !bg-white !text-[#a4246a] !border-0 !min-h-14 text-base relative z-10" onClick={() => nav(`/treino/${d.active!.id}`)}><Icon n="play" />CONTINUAR TREINO</button>
        </section>
      ) : todays.length ? (
        todays.map((w) => {
          const its = items[w.id] ?? []
          const done = d.sessions.some((s) => s.planned_workout_id === w.id)
          return (
            <section key={w.id} className={done ? 'card p-5' : 'hero p-5'} aria-label="Treino de hoje">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`text-[11px] font-extrabold tracking-[.14em] ${done ? 'text-ok' : 'opacity-90'}`}>{done ? 'TREINO DE HOJE · FEITO' : 'TREINO DE HOJE'}</div>
                  <h2 className="text-[26px] leading-8 font-extrabold tracking-tight mt-1.5">{w.name}</h2>
                </div>
                {done && <span className="w-10 h-10 rounded-2xl bg-ok text-white grid place-items-center shrink-0"><Icon n="check" stroke={3} /></span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 relative z-10">
                {[
                  [w.location === 'casa' ? 'home' : 'dumbbell', w.location === 'casa' ? 'Em casa' : 'Academia'],
                  ['list', `${its.length} exercício${its.length === 1 ? '' : 's'}`],
                  ['clock', its.length ? `~${estMinutes(its)} min` : '–'],
                ].map(([i, t]) => <span key={t} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${done ? 'bg-surface2 text-muted' : 'bg-white/20'}`}><Icon n={i} size={14} />{t}</span>)}
              </div>
              {its.length > 0 ? (
                <div className="flex items-center gap-3 mt-4 relative z-10">
                  <div className="avatar-stack flex">{its.slice(0, 5).map((it) => <div key={it.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)' }}><ExThumb ex={{ demo: LIB_BY_ID[it.exercise_id]?.demo, group: it.muscle_group }} size={44} /></div>)}</div>
                  {its.length > 5 && <span className={`text-sm font-bold ${done ? 'text-muted' : 'opacity-90'}`}>+{its.length - 5}</span>}
                </div>
              ) : <p className="text-sm mt-3 opacity-90 relative z-10">Sem exercícios ainda. <Link className="font-bold underline" to={`/plano?w=${w.id}`}>Adicionar</Link></p>}
              <button className={`btn w-full mt-5 !min-h-14 text-base tracking-wide relative z-10 ${done ? 'btn-primary' : '!bg-white !text-[#a4246a] !border-0'}`} onClick={() => start(w.id)} disabled={!its.length}><Icon n="play" />{done ? 'FAZER DE NOVO' : 'INICIAR TREINO'}</button>
            </section>
          )
        })
      ) : (
        <section className="card p-5" aria-label="Hoje">
          <div className="flex items-center gap-3">
            <div className="tile-ic bg-accentsoft text-accentink"><Icon n={doneToday.length ? 'trophy' : 'moon'} size={20} /></div>
            <div><div className="h-eyebrow">{doneToday.length ? 'Treino de hoje concluído' : 'Hoje'}</div><h2 className="text-xl font-extrabold tracking-tight">{doneToday.length ? 'Dia cumprido, bom trabalho!' : 'Dia livre'}</h2></div>
          </div>
          <p className="text-sm text-muted mt-3">Quer treinar mesmo assim? Comece um treino livre e monte tudo na hora, ou planeje o treino de hoje.</p>
          <div className="grid gap-2 mt-4">
            <button className="btn btn-primary !min-h-14" onClick={() => start(null)}><Icon n="play" />INICIAR TREINO LIVRE</button>
            <button className="btn" onClick={planToday}><Icon n="plus" />Planejar treino de hoje</button>
          </div>
        </section>
      )}

      {/* semana */}
      <section className="card p-5" aria-label="Progresso da semana">
        <div className="flex items-center justify-between">
          <b className="text-lg">Sua semana</b>
          <span className="chip on tnum">{wk} de {goalTarget} treinos</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 mt-4">
          {weekDays(today).map((day, i) => {
            const s = dayState(day, d)
            const isToday = day === today
            return (
              <Link key={day} to="/calendario" className="text-center" aria-label={`${DIAS_CURTOS[(i + 1) % 7]} ${parseInt(day.slice(8), 10)}: ${s === 'done' ? 'treino realizado' : s === 'planned' ? 'planejado' : s === 'missed' ? 'não realizado' : 'sem treino'}`}>
                <div className="text-[10px] text-muted font-bold mb-1.5">{DIAS_CURTOS[(i + 1) % 7]}</div>
                <div className={`aspect-[3/4] rounded-2xl grid place-items-center font-extrabold text-sm tnum ${s === 'done' ? 'bg-ok text-white' : s === 'planned' ? 'bg-plan text-white' : s === 'missed' ? 'bg-miss text-white' : 'bg-surface2 text-muted'} ${isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}>
                  {s === 'done' ? <Icon n="check" size={16} stroke={3} /> : parseInt(day.slice(8), 10)}
                </div>
              </Link>
            )
          })}
        </div>
        <div className="pb mt-4"><i style={{ width: `${Math.min(100, (wk / goalTarget) * 100)}%` }} /></div>
        <p className="text-xs text-muted mt-2">{wk >= goalTarget ? 'Meta da semana cumprida. Parabéns!' : `Faltam ${goalTarget - wk} para a meta da semana.`}</p>
      </section>

      {/* números */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ['flame', 'var(--miss)', String(st), 'dias em sequência'],
          ['check', 'var(--ok)', String(d.sessions.length), 'treinos feitos'],
          ['clock', 'var(--plan)', last5.length ? fmtDurLong(lastTotal) : '–', `últimos ${last5.length || ''} treinos`],
        ].map(([i, c, v, l]) => (
          <div key={l} className="card-flat p-3.5">
            <div className="tile-ic" style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}><Icon n={i} size={18} /></div>
            <div className="text-[22px] leading-7 font-extrabold tnum mt-2.5">{v}</div>
            <div className="text-[11px] text-muted font-semibold leading-tight">{l}</div>
          </div>
        ))}
      </div>

      {next && (
        <Link to={`/plano?w=${next.id}`} className="card-flat p-4 flex items-center gap-3">
          <div className="tile-ic bg-[color-mix(in_srgb,var(--plan)_16%,transparent)] text-plan shrink-0"><Icon n="calendar" size={18} /></div>
          <div className="flex-1 min-w-0"><div className="text-[11px] font-extrabold tracking-[.12em] text-muted">PRÓXIMO TREINO</div><b className="block truncate">{next.name}</b><span className="text-[13px] text-muted">{fmtDay(next.date!)} · {nextItems} exercício{nextItems === 1 ? '' : 's'}</span></div>
          <Icon n="chevR" className="text-muted" />
        </Link>
      )}

      {activeGoals.length > 0 && (
        <section className="card-flat p-4">
          <div className="flex items-center justify-between mb-3"><b>Metas</b><Link to="/perfil" className="text-sm font-bold text-accentink">Ver todas</Link></div>
          <div className="space-y-3.5">
            {activeGoals.slice(0, 3).map((g) => (
              <div key={g.goal.id}>
                <div className="flex justify-between text-sm gap-2"><span className="font-semibold">{g.label.replace(/X/, String(g.target))}</span><span className="text-muted tnum shrink-0">{Math.round(g.current * 10) / 10}/{g.target}</span></div>
                <div className="pb mt-1.5"><i style={{ width: `${g.pct * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* atalhos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ['/plano', 'list', 'Planejar'],
          ['/treinos', 'dumbbell', 'Exercícios'],
          ['/historico', 'chart', 'Evolução'],
        ].map(([to, i, l]) => (
          <Link key={to} to={to} className="card-flat py-4 flex flex-col items-center gap-2 text-sm font-bold active:scale-95 transition">
            <span className="tile-ic bg-accentsoft text-accentink"><Icon n={i} size={19} /></span>{l}
          </Link>
        ))}
      </div>

      {!d.workouts.length && !d.sessions.length && (
        <div className="card-flat p-5 text-center">
          <b>Comece planejando sua semana</b>
          <p className="text-sm text-muted mt-1">Escolha os dias e os exercícios em Planejamento, ou aplique os treinos padrão.</p>
          <Link to="/plano" className="btn btn-primary mt-3">Ir para o planejamento</Link>
        </div>
      )}
    </div>
  )
}
