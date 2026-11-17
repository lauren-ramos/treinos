import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Icon, PageHeader, Spinner } from '../components/ui'
import { db, alive } from '../lib/db'
import { DIAS, DIAS_CURTOS, MESES, dkey, fmtClock, fmtDay, fmtDur, monthGrid, parseKey, todayKey } from '../lib/dates'
import { STATUS_LABEL, statusOf } from '../lib/plan'
import { dayState, durSec, goalProgress, monthSummary, sessionsOn, useAppData } from '../lib/stats'

const STATE_CLASS = {
  done: 'bg-ok text-white',
  planned: 'bg-plan text-white',
  missed: 'bg-miss text-white',
  none: 'bg-surface2 text-muted',
} as const

export default function CalendarPage() {
  const d = useAppData()
  const nav = useNavigate()
  const now = new Date()
  const [y, setY] = useState(now.getFullYear())
  const [m, setM] = useState(now.getMonth())
  const [sel, setSel] = useState<string>(todayKey())
  const today = todayKey()
  const cells = useMemo(() => monthGrid(y, m), [y, m])
  const items = useLiveQuery(async () => alive(await db.planned_items.toArray()), [], [])
  const sets = useLiveQuery(async () => alive(await db.session_sets.toArray()).filter((s) => s.done), [], [])
  if (!d.ready) return <Spinner />

  const sum = monthSummary(y, m, d)
  const go = (delta: number) => { const t = new Date(y, m + delta, 1); setY(t.getFullYear()); setM(t.getMonth()) }
  const selWorkouts = d.workouts.filter((w) => w.date === sel)
  const selSessions = sessionsOn(sel, d)
  const reached = d.goals.map((g) => goalProgress(g, d)).filter((p) => p.achieved).length

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Calendário" title={`${MESES[m][0].toUpperCase()}${MESES[m].slice(1)} de ${y}`} right={
        <>
          <button className="btn btn-icon" onClick={() => go(-1)} aria-label="Mês anterior"><Icon n="chevL" /></button>
          <button className="btn btn-icon" onClick={() => go(1)} aria-label="Próximo mês"><Icon n="chevR" /></button>
        </>
      } />

      <div className="card p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">{[1, 2, 3, 4, 5, 6, 0].map((i) => <div key={i} className="text-center text-[11px] font-bold text-muted">{DIAS_CURTOS[i]}</div>)}</div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />
            const st = dayState(c, d)
            const isSel = c === sel
            return (
              <button key={c} onClick={() => setSel(c)} aria-label={`${parseKey(c).getDate()} de ${MESES[m]}: ${st === 'done' ? 'treino realizado' : st === 'planned' ? 'treino planejado' : st === 'missed' ? 'treino não realizado' : 'sem treino'}`} aria-pressed={isSel}
                className={`aspect-square rounded-2xl grid place-items-center text-sm font-bold tnum transition active:scale-95 ${STATE_CLASS[st]} ${c === today ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''} ${isSel ? 'outline outline-[3px] outline-fg/70 -outline-offset-3' : ''}`}>
                {st === 'done' ? <span className="flex flex-col items-center leading-none gap-0.5"><Icon n="check" size={13} stroke={3} />{parseKey(c).getDate()}</span> : parseKey(c).getDate()}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-xs font-semibold text-muted">
          {[['bg-ok', 'Treino realizado'], ['bg-plan', 'Treino planejado'], ['bg-miss', 'Não realizado'], ['bg-surface2 border border-line', 'Sem treino']].map(([c, l]) => <span key={l} className="inline-flex items-center gap-1.5"><i className={`w-3.5 h-3.5 rounded ${c}`} />{l}</span>)}
        </div>
      </div>

      {/* dia selecionado */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between"><b className="text-lg">{fmtDay(sel)}</b>{sel === today && <span className="chip on">Hoje</span>}</div>
        {!selWorkouts.length && !selSessions.length && <p className="text-sm text-muted">Dia sem treino. {sel >= today ? 'Que tal planejar um?' : ''}</p>}
        {selWorkouts.map((w) => {
          const its = (items ?? []).filter((i) => i.workout_id === w.id).sort((a, b) => a.position - b.position)
          const stt = statusOf(w, d.sessions, today)
          return (
            <div key={w.id} className="card-flat p-3.5">
              <div className="flex items-center justify-between gap-2"><b>{w.name}</b><span className={`chip ${stt === 'realizado' ? '!bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] !text-ok' : stt === 'nao-realizado' ? '!bg-[color-mix(in_srgb,var(--miss)_18%,transparent)] !text-miss' : stt === 'planejado' ? '!bg-[color-mix(in_srgb,var(--plan)_16%,transparent)] !text-plan' : ''}`}>{STATUS_LABEL[stt]}</span></div>
              <p className="text-xs text-muted mt-0.5">Planejado · {w.kind || 'Treino'} · {w.location === 'casa' ? 'Em casa' : 'Academia'}</p>
              <ul className="mt-2 space-y-1">{its.map((i) => <li key={i.id} className="text-sm flex justify-between gap-2"><span className="truncate">{i.name}</span><span className="text-muted tnum shrink-0">{i.sets} × {i.reps}</span></li>)}{!its.length && <li className="text-sm text-muted">Sem exercícios previstos.</li>}</ul>
              <button className="btn btn-sm mt-3" onClick={() => nav(`/plano?w=${w.id}`)}><Icon n="edit" size={15} />Abrir no planejamento</button>
            </div>
          )
        })}
        {selSessions.map((s) => {
          const ss = (sets ?? []).filter((x) => x.session_id === s.id)
          return (
            <div key={s.id} className="card-flat p-3.5 border-ok/50">
              <div className="flex items-center justify-between gap-2"><b>{s.name}</b><span className="chip !bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] !text-ok"><Icon n="check" size={13} />Realizado</span></div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center text-sm">
                <div><div className="font-extrabold tnum">{fmtClock(s.started_at)}–{fmtClock(s.ended_at ?? s.started_at)}</div><div className="text-[11px] text-muted">Horário</div></div>
                <div><div className="font-extrabold tnum">{fmtDur(durSec(s))}</div><div className="text-[11px] text-muted">Duração</div></div>
                <div><div className="font-extrabold">{s.location === 'casa' ? 'Casa' : 'Academia'}</div><div className="text-[11px] text-muted">Local</div></div>
              </div>
              <p className="text-xs text-muted mt-2">{ss.length} séries concluídas{s.notes ? ` · “${s.notes}”` : ''}</p>
            </div>
          )
        })}
        {sel >= today && !selWorkouts.length && <button className="btn btn-soft" onClick={() => nav('/plano')}><Icon n="plus" />Planejar treino</button>}
      </div>

      {/* resumo mensal */}
      <div className="card p-5">
        <b className="text-lg">Resumo de {MESES[m]}</b>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {[
            [String(sum.count), 'treinos realizados', 'check'],
            [`${Math.floor(sum.hours)}h ${String(Math.round((sum.hours % 1) * 60)).padStart(2, '0')}min`, 'horas treinadas', 'clock'],
            [String(sum.avgPerWeek).replace('.', ','), 'treinos por semana (média)', 'repeat'],
            [String(reached), 'metas alcançadas', 'trophy'],
          ].map(([v, l, i]) => <div key={l} className="rounded-2xl bg-surface2 p-3"><Icon n={i} size={17} className="text-accentink" /><div className="text-xl font-extrabold tnum mt-1">{v}</div><div className="text-[11px] text-muted font-semibold leading-tight">{l}</div></div>)}
        </div>
        <div className="mt-4">
          <div className="text-xs font-bold text-muted mb-2">Dias mais ativos{sum.topDays.length ? `: ${sum.topDays.map((i) => DIAS[i]).join(', ')}` : ''}</div>
          <div className="grid grid-cols-7 gap-1.5 items-end h-16">
            {[1, 2, 3, 4, 5, 6, 0].map((i) => <div key={i} className="flex flex-col items-center justify-end h-full gap-1"><div className="w-full rounded-md bg-accent/80" style={{ height: `${sum.dowCount[i] ? 12 + (sum.dowCount[i] / Math.max(...sum.dowCount)) * 70 : 4}%`, opacity: sum.dowCount[i] ? 1 : 0.25 }} /><span className="text-[10px] text-muted font-bold">{DIAS_CURTOS[i]}</span></div>)}
          </div>
        </div>
      </div>
      <span className="hidden">{dkey(new Date())}</span>
    </div>
  )
}
