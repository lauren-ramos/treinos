import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Empty, Icon, PageHeader, Spinner, useConfirm, useToast } from '../components/ui'
import { ExerciseChart } from '../components/exercise'
import { db, alive, softDelete, softDeleteRows } from '../lib/db'
import { MESES, addDays, fmtClock, fmtDay, fmtDur, fmtDurLong, fmtShort, parseKey, todayKey, weekStart } from '../lib/dates'
import { durSec, plannedInWeek, useAppData } from '../lib/stats'
import type { Session } from '../lib/types'

const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 } }
const axis = { tick: { fontSize: 11, fill: 'var(--muted)' }, tickLine: false, axisLine: false } as const

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return <div className="card p-4"><b className="block">{title}</b>{sub && <span className="text-xs text-muted">{sub}</span>}<div className="h-48 mt-3">{children}</div></div>
}

export default function History() {
  const d = useAppData()
  const toast = useToast()
  const confirm = useConfirm()
  const [exSel, setExSel] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const all = useLiveQuery(async () => ({
    ses: alive(await db.session_exercises.toArray()),
    sets: alive(await db.session_sets.toArray()).filter((s) => s.done),
  }), [], undefined)

  const exOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of d.sets) m.set(s.exercise_id, s.exercise_name)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [d.sets])
  const exId = exSel || exOptions[0]?.[0] || ''

  const today = todayKey()
  const monthly = useMemo(() => {
    const out: { mes: string; treinos: number }[] = []
    const t = new Date()
    for (let i = 5; i >= 0; i--) {
      const x = new Date(t.getFullYear(), t.getMonth() - i, 1)
      out.push({ mes: MESES[x.getMonth()].slice(0, 3), treinos: d.sessions.filter((s) => { const p = parseKey(s.date); return p.getFullYear() === x.getFullYear() && p.getMonth() === x.getMonth() }).length })
    }
    return out
  }, [d.sessions])
  const weekly = useMemo(() => {
    const out: { sem: string; treinos: number; volume: number; consist: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const ws = weekStart(addDays(today, -7 * i))
      const inW = d.sessions.filter((s) => weekStart(s.date) === ws)
      const ids = new Set(inW.map((s) => s.id))
      const vol = d.sets.filter((x) => ids.has(x.session_id)).reduce((a, x) => a + (x.reps ?? 0) * (x.load ?? 0), 0)
      const planned = plannedInWeek(ws, d)
      const doneP = d.workouts.filter((w) => w.date && !w.cancelled && weekStart(w.date) === ws && d.sessions.some((s) => s.planned_workout_id === w.id)).length
      out.push({ sem: fmtShort(ws), treinos: inW.length, volume: Math.round(vol), consist: planned ? Math.round((doneP / planned) * 100) : 0 })
    }
    return out
  }, [d, today])
  const durations = d.sessions.slice(-12).map((s) => ({ data: fmtShort(s.date), min: Math.round(durSec(s) / 60) }))
  const avg = d.sessions.length ? d.sessions.reduce((a, s) => a + durSec(s), 0) / d.sessions.length : 0

  if (!d.ready || !all) return <Spinner />
  const list = [...d.sessions].reverse()

  async function del(s: Session) {
    if (!(await confirm({ title: 'Excluir este treino do histórico?', text: 'As séries registradas nele também serão removidas. Isso não pode ser desfeito.', ok: 'Excluir', danger: true }))) return
    await softDelete(db.sessions, s.id)
    await softDeleteRows(db.session_sets, (await db.session_sets.where('session_id').equals(s.id).toArray()))
    await softDeleteRows(db.session_exercises, (await db.session_exercises.where('session_id').equals(s.id).toArray()))
    toast('Treino excluído do histórico.')
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Histórico" title="Sua evolução" />
      {!d.sessions.length ? (
        <Empty icon="chart" title="Ainda não há treinos finalizados" text="Quando você concluir seu primeiro treino, ele aparece aqui junto com gráficos de frequência, tempo e cargas." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[[String(d.sessions.length), 'treinos', 'check'], [fmtDurLong(avg), 'tempo médio', 'clock'], [String(d.sets.length), 'séries feitas', 'repeat']].map(([v, l, i]) => <div key={l} className="card-flat p-3.5"><Icon n={i} size={17} className="text-accentink" /><div className="text-xl sm:text-2xl font-extrabold tnum mt-1">{v}</div><div className="text-[11px] text-muted font-semibold">{l}</div></div>)}
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3"><b>Evolução de carga por exercício</b>
              <select className="select !w-auto !min-h-10 max-w-[55%]" value={exId} onChange={(e) => setExSel(e.target.value)} aria-label="Exercício">{exOptions.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
            </div>
            {exId ? <ExerciseChart exerciseId={exId} height={210} /> : <p className="text-sm text-muted">Sem séries registradas.</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <ChartCard title="Frequência mensal" sub="Treinos por mês">
              <ResponsiveContainer><BarChart data={monthly} margin={{ left: -22, right: 4, top: 6 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip {...tip} cursor={{ fill: 'var(--surface-2)' }} /><Bar dataKey="treinos" name="Treinos" fill="var(--accent)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Tempo médio dos treinos" sub="Duração dos últimos treinos (min)">
              <ResponsiveContainer><LineChart data={durations} margin={{ left: -22, right: 8, top: 6 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="data" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Line dataKey="min" name="Minutos" stroke="var(--plan)" strokeWidth={3} dot={{ r: 3.5 }} /></LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Evolução semanal" sub="Treinos por semana (últimas 8)">
              <ResponsiveContainer><BarChart data={weekly} margin={{ left: -22, right: 4, top: 6 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="sem" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip {...tip} cursor={{ fill: 'var(--surface-2)' }} /><Bar dataKey="treinos" name="Treinos" fill="var(--ok)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Consistência" sub="% dos treinos planejados que você fez">
              <ResponsiveContainer><LineChart data={weekly} margin={{ left: -14, right: 8, top: 6 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="sem" {...axis} /><YAxis {...axis} domain={[0, 100]} unit="%" /><Tooltip {...tip} /><Line dataKey="consist" name="Consistência (%)" stroke="var(--accent)" strokeWidth={3} dot={{ r: 3.5 }} /></LineChart></ResponsiveContainer>
            </ChartCard>
          </div>

          <div>
            <b className="block mb-3 text-lg">Treinos realizados</b>
            <div className="space-y-3">
              {list.map((s) => {
                const exs = all.ses.filter((e) => e.session_id === s.id && e.status !== 'removed' || (e.session_id === s.id && all.sets.some((x) => x.session_exercise_id === e.id))).sort((a, b) => a.position - b.position)
                const ss = all.sets.filter((x) => x.session_id === s.id)
                const isOpen = open === s.id
                return (
                  <div key={s.id} className="card">
                    <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                      <div className="w-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] text-ok grid place-items-center shrink-0"><Icon n="check" size={22} stroke={3} /></div>
                      <div className="min-w-0 flex-1"><b className="block truncate">{s.name}</b><span className="text-xs text-muted">{fmtDay(s.date)} · {fmtClock(s.started_at)} · {fmtDur(durSec(s))} · {ss.length} séries</span></div>
                      <Icon n={isOpen ? 'chevU' : 'chevD'} className="text-muted" />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-line space-y-3">
                        {exs.filter((e) => ss.some((x) => x.session_exercise_id === e.id)).map((e) => (
                          <div key={e.id}><div className="text-sm font-bold">{e.name}{e.replaced_from ? <span className="font-normal text-muted"> (no lugar de {e.replaced_from})</span> : null}</div>
                            <div className="flex flex-wrap gap-1.5 mt-1">{ss.filter((x) => x.session_exercise_id === e.id).sort((a, b) => a.set_index - b.set_index).map((x, i) => <span key={x.id} className="chip tnum">S{i + 1}: {x.load ? `${String(x.load).replace('.', ',')} kg × ` : ''}{x.reps ?? 0}{e.unit === 'seg' ? ' s' : ''}</span>)}</div>
                          </div>
                        ))}
                        {s.notes && <p className="text-sm text-muted italic">“{s.notes}”</p>}
                        <button className="btn btn-danger btn-sm" onClick={() => del(s)}><Icon n="trash" size={15} />Excluir do histórico</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
