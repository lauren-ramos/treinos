import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, Ring, Spinner, useToast } from '../components/ui'
import { ExThumb } from '../components/exercise'
import { db, getProfile, alive } from '../lib/db'
import { addDays, DIAS_CURTOS, fmtDay, fmtDurLong, fmtShort, todayKey, weekDays } from '../lib/dates'
import { itemsOf, createWorkout } from '../lib/plan'
import { startSession } from '../lib/session'
import { LIB_BY_ID } from '../data/library'
import { dayState, durSec, goalProgress, plannedInWeek, streak, useAppData, weekCount } from '../lib/stats'
import { useInstall } from '../lib/pwa'

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

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
  const customCount = useLiveQuery(async () => alive(await db.custom_exercises.toArray()).length, [], 0)
  void customCount

  if (!d.ready || profile === undefined) return <Spinner />

  const wk = weekCount(today, d)
  const planned = plannedInWeek(today, d)
  const goalTarget = planned || profile.available_days.length || 3
  const last5 = d.sessions.slice(-5)
  const lastTotal = last5.reduce((a, s) => a + durSec(s), 0)
  const st = streak(d)
  const activeGoals = d.goals.filter((g) => g.active).map((g) => goalProgress(g, d))
  const doneToday = d.sessions.filter((s) => s.date === today)

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
      <div>
        <div className="h-eyebrow">{fmtDay(today)}</div>
        <h1 className="text-[30px] leading-9 font-extrabold tracking-tight">{hello()}{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}</h1>
      </div>

      {(install.canPrompt || install.ios) && !install.installed && (
        <div className="card-flat p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accentsoft text-accentink grid place-items-center shrink-0"><Icon n="download" /></div>
          <div className="flex-1 text-sm"><b>Instale o app no celular</b><div className="text-muted text-xs">{install.ios ? 'No Safari: Compartilhar → Adicionar à Tela de Início.' : 'Abra como app, em tela cheia e com acesso offline.'}</div></div>
          {install.canPrompt && <button className="btn btn-soft btn-sm" onClick={install.install}>Instalar</button>}
        </div>
      )}

      {/* treino de hoje */}
      {d.active ? (
        <div className="card p-5 text-onaccent border-0" style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 62%, #7c2d5b))' }}>
          <div className="text-xs font-bold tracking-widest opacity-90">TREINO EM ANDAMENTO</div>
          <h2 className="text-2xl font-extrabold mt-1">{d.active.name}</h2>
          <button className="btn w-full mt-4 !bg-white !text-[#a4246a] !border-0 !min-h-14 text-base" onClick={() => nav(`/treino/${d.active!.id}`)}><Icon n="play" />CONTINUAR TREINO</button>
        </div>
      ) : todays.length ? (
        todays.map((w) => {
          const its = items[w.id] ?? []
          const done = d.sessions.some((s) => s.planned_workout_id === w.id)
          return (
            <div key={w.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="h-eyebrow">{done ? 'Treino de hoje · realizado' : 'Treino de hoje'}</div>
                  <h2 className="text-2xl font-extrabold leading-7 tracking-tight mt-0.5">{w.name}</h2>
                  <p className="text-sm text-muted mt-1">{w.kind || 'Treino'} · {w.location === 'casa' ? 'Em casa' : 'Academia'} · {its.length} exercício{its.length === 1 ? '' : 's'}</p>
                </div>
                {done && <span className="chip !bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] !text-ok"><Icon n="check" size={14} />Feito</span>}
              </div>
              {its.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {its.slice(0, 5).map((it) => (
                    <li key={it.id} className="flex items-center gap-3">
                      <ExThumb ex={{ demo: LIB_BY_ID[it.exercise_id]?.demo, group: it.muscle_group }} size={42} />
                      <div className="min-w-0 flex-1"><b className="text-[15px] block truncate leading-tight">{it.name}</b><span className="text-xs text-muted">{it.sets} × {it.reps}{it.unit === 'seg' ? ' s' : ''}</span></div>
                    </li>
                  ))}
                  {its.length > 5 && <li className="text-xs text-muted pl-1">+ {its.length - 5} exercícios</li>}
                </ul>
              ) : <p className="text-sm text-muted mt-3">Este treino ainda não tem exercícios. <Link className="text-accentink font-bold" to={`/plano?w=${w.id}`}>Adicionar</Link></p>}
              <button className="btn btn-primary w-full mt-5 !min-h-14 text-base tracking-wide" onClick={() => start(w.id)} disabled={!its.length}><Icon n="play" />{done ? 'FAZER DE NOVO' : 'INICIAR TREINO'}</button>
            </div>
          )
        })
      ) : (
        <div className="card p-5">
          <div className="h-eyebrow">{doneToday.length ? 'Treino de hoje concluído' : 'Hoje'}</div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-0.5">{doneToday.length ? 'Bom trabalho! Dia cumprido.' : 'Nenhum treino planejado'}</h2>
          <p className="text-sm text-muted mt-1">Quer treinar mesmo assim? Comece um treino livre e monte os exercícios na hora, ou planeje o treino de hoje.</p>
          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            <button className="btn btn-primary !min-h-14" onClick={() => start(null)}><Icon n="play" />INICIAR TREINO LIVRE</button>
            <button className="btn !min-h-14" onClick={planToday}><Icon n="plus" />Planejar treino de hoje</button>
          </div>
        </div>
      )}

      {/* progresso semanal */}
      <div className="card p-5">
        <div className="flex items-center gap-5">
          <Ring value={wk} max={goalTarget} size={112}>
            <div><b className="text-3xl font-extrabold tnum">{wk}</b><span className="text-muted text-sm font-bold"> / {goalTarget}</span><div className="text-[11px] text-muted font-semibold">treinos</div></div>
          </Ring>
          <div className="flex-1 min-w-0">
            <b className="text-lg">Progresso da semana</b>
            <p className="text-sm text-muted">{wk >= goalTarget ? 'Meta da semana cumprida. Parabéns!' : `Faltam ${goalTarget - wk} para a meta da semana.`}</p>
            <div className="grid grid-cols-7 gap-1.5 mt-3">
              {weekDays(today).map((day, i) => {
                const s = dayState(day, d)
                return (
                  <div key={day} className="text-center" title={`${fmtShort(day)}: ${s === 'done' ? 'treino realizado' : s === 'planned' ? 'planejado' : s === 'missed' ? 'não realizado' : 'sem treino'}`}>
                    <div className={`h-8 rounded-full grid place-items-center ${s === 'done' ? 'bg-ok text-white' : s === 'planned' ? 'bg-plan text-white' : s === 'missed' ? 'bg-miss text-white' : 'bg-surface2 text-muted'} ${day === today ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}>
                      {s === 'done' ? <Icon n="check" size={15} stroke={3} /> : <span className="text-[11px] font-bold">{parseInt(day.slice(8), 10)}</span>}
                    </div>
                    <div className="text-[10px] text-muted font-bold mt-1">{DIAS_CURTOS[(i + 1) % 7]}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-flat p-4"><Icon n="flame" className="text-miss" /><div className="text-3xl font-extrabold tnum mt-1">{st}</div><div className="text-xs text-muted font-semibold">dias treinados em sequência</div></div>
        <div className="card-flat p-4"><Icon n="clock" className="text-plan" /><div className="text-3xl font-extrabold tnum mt-1">{last5.length ? fmtDurLong(lastTotal) : '–'}</div><div className="text-xs text-muted font-semibold">tempo nos últimos {last5.length || ''} treinos</div></div>
      </div>

      {next && (
        <Link to={`/plano?w=${next.id}`} className="card-flat p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[color-mix(in_srgb,var(--plan)_16%,transparent)] text-plan grid place-items-center"><Icon n="calendar" /></div>
          <div className="flex-1 min-w-0"><div className="text-xs font-bold text-muted">PRÓXIMO TREINO</div><b className="block truncate">{next.name}</b><span className="text-sm text-muted">{fmtDay(next.date!)} · {nextItems} exercício{nextItems === 1 ? '' : 's'} · {next.location === 'casa' ? 'Em casa' : 'Academia'}</span></div>
          <Icon n="chevR" className="text-muted" />
        </Link>
      )}

      {activeGoals.length > 0 && (
        <div className="card-flat p-4">
          <div className="flex items-center justify-between mb-3"><b>Metas</b><Link to="/perfil" className="text-sm font-bold text-accentink">Ver todas</Link></div>
          <div className="space-y-3">
            {activeGoals.slice(0, 3).map((g) => (
              <div key={g.goal.id}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{g.label}</span><span className="text-muted tnum">{Math.round(g.current * 10) / 10}/{g.target}</span></div>
                <div className="pb mt-1.5"><i style={{ width: `${g.pct * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!d.workouts.length && !d.sessions.length && (
        <div className="card-flat p-5 text-center">
          <b>Comece planejando sua semana</b>
          <p className="text-sm text-muted mt-1">Escolha os dias e os exercícios em Planejamento. Você pode mudar tudo quando quiser.</p>
          <Link to="/plano" className="btn btn-primary mt-3">Ir para o planejamento</Link>
        </div>
      )}
      <span className="hidden">{addDays(today, 0)}</span>
    </div>
  )
}
