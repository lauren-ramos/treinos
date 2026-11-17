import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DemoPlayer, StaticFigure } from './Figure'
import { Field, Icon, Modal, useToast, useConfirm } from './ui'
import { POSES } from '../data/poses'
import { GROUPS, GROUP_COLOR } from '../data/library'
import { useCatalog, type Ex } from '../lib/catalog'
import { db, put, softDelete } from '../lib/db'
import { exerciseHistory } from '../lib/progress'
import { fmtShort } from '../lib/dates'
import { uid } from '../lib/id'
import type { CustomExercise, Difficulty, Location } from '../lib/types'

export const DIFF_LABEL: Record<Difficulty, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }
export const LOC_LABEL: Record<Location, string> = { academia: 'Academia', casa: 'Casa' }

/** Demonstração animada; sem animação, mostra uma instrução visual alternativa (nunca uma imagem de outro exercício). */
export function ExVisual({ ex, controls = true, className = '' }: { ex: Ex; controls?: boolean; className?: string }) {
  const demo = ex.demo ? POSES[ex.demo] : undefined
  if (demo) return <DemoPlayer demo={demo} group={ex.group} controls={controls} className={className} />
  const steps = ex.customSteps?.filter(Boolean) ?? []
  return (
    <div className={`demo grid place-items-center p-4 ${className}`} style={{ aspectRatio: 'auto', minHeight: 140 }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto grid place-items-center text-white" style={{ background: GROUP_COLOR[ex.group] ?? 'var(--accent)' }}>
          <Icon n="dumbbell" size={28} />
        </div>
        <b className="block mt-2">{ex.name}</b>
        <span className="text-xs text-muted">Exercício personalizado: sem animação disponível.{steps.length ? ' Veja os passos abaixo.' : ''}</span>
      </div>
    </div>
  )
}

export function ExThumb({ ex, size = 56 }: { ex: { demo?: string; group: string }; size?: number }) {
  const demo = ex.demo ? POSES[ex.demo] : undefined
  return (
    <div className="rounded-2xl overflow-hidden shrink-0 grid place-items-center" style={{ width: size, height: size, background: 'var(--accent-soft)' }}>
      {demo ? (
        <StaticFigure demo={demo} group={ex.group} className="w-[150%] h-[150%] max-w-none" />
      ) : (
        <Icon n="dumbbell" size={size * 0.45} className="text-accentink" />
      )}
    </div>
  )
}

export function MuscleTag({ g }: { g: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: GROUP_COLOR[g] ?? 'var(--accent)' }} />
      {g}
    </span>
  )
}

/* ---------------- gráfico de evolução por exercício ---------------- */
export function ExerciseChart({ exerciseId, height = 190 }: { exerciseId: string; height?: number }) {
  const hist = useLiveQuery(() => exerciseHistory(exerciseId), [exerciseId], undefined)
  if (!hist) return null
  if (hist.length < 1) return <p className="text-sm text-muted">Ainda não há treinos finalizados com este exercício. O gráfico aparece depois do primeiro.</p>
  const data = hist.map((h) => ({
    data: fmtShort(h.date),
    carga: Math.max(...h.sets.map((s) => s.load)),
    volume: Math.round(h.sets.reduce((a, s) => a + s.load * s.reps, 0)),
    reps: h.sets.reduce((a, s) => a + s.reps, 0),
  }))
  const hasLoad = data.some((d) => d.carga > 0)
  const key = hasLoad ? 'carga' : 'reps'
  return (
    <div>
      <div className="text-xs font-semibold text-muted mb-1">{hasLoad ? 'Maior carga por treino (kg, linha rosa) e volume total (kg × reps, tracejado azul)' : 'Total de repetições por treino'}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: hasLoad ? -8 : 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="a" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} allowDecimals={false} domain={['auto', 'auto']} />
            {hasLoad && <YAxis yAxisId="b" orientation="right" tick={{ fontSize: 10, fill: 'var(--plan)' }} tickLine={false} axisLine={false} allowDecimals={false} domain={['auto', 'auto']} />}
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
            <Line yAxisId="a" type="monotone" dataKey={key} stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent)' }} name={hasLoad ? 'Carga (kg)' : 'Repetições'} />
            {hasLoad && <Line yAxisId="b" type="monotone" dataKey="volume" stroke="var(--plan)" strokeWidth={2} dot={false} name="Volume (kg×reps)" strokeDasharray="4 3" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ---------------- detalhes: "Como fazer?" ---------------- */
function Block({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="flex items-center gap-2 text-[15px] font-bold mb-2"><span className="w-7 h-7 rounded-lg bg-accentsoft text-accentink grid place-items-center"><Icon n={icon} size={16} /></span>{title}</h3>
      {children}
    </section>
  )
}

export function ExerciseDetail({ ex, open, onClose, onAdd, addLabel = 'Adicionar ao treino' }: { ex: Ex | null; open: boolean; onClose: () => void; onAdd?: (ex: Ex) => void; addLabel?: string }) {
  const lib = ex?.lib
  return (
    <Modal open={open && !!ex} onClose={onClose} wide title={ex?.name} footer={onAdd && ex ? <button className="btn btn-primary w-full" onClick={() => { onAdd(ex); onClose() }}><Icon n="plus" />{addLabel}</button> : undefined}>
      {ex && (
        <div>
          <ExVisual ex={ex} />
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="chip on"><MuscleTag g={ex.group} /></span>
            <span className="chip">{DIFF_LABEL[ex.difficulty]}</span>
            {ex.location.map((l) => <span key={l} className="chip">{LOC_LABEL[l]}</span>)}
            <span className="chip">{ex.sets} séries × {ex.reps}{ex.unit === 'seg' ? ' s' : ''}</span>
            <span className="chip"><Icon n="clock" size={13} /> descanso {ex.rest}s</span>
          </div>
          {ex.description && <p className="mt-4 text-[15px] leading-relaxed">{ex.description}</p>}
          {ex.equipment.length > 0 && <p className="mt-2 text-sm text-muted"><b>Equipamentos:</b> {ex.equipment.join(', ')}</p>}

          {lib ? (
            <>
              <Block title="Posição inicial" icon="flag"><p className="text-[15px] leading-relaxed">{lib.start}</p></Block>
              <Block title="Execução, passo a passo" icon="list">
                <ol className="space-y-2.5">
                  {lib.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                      <b className="w-6 h-6 rounded-full bg-accent text-onaccent text-xs grid place-items-center shrink-0 mt-0.5">{i + 1}</b>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </Block>
              <Block title="Respiração" icon="wind"><p className="text-[15px] leading-relaxed">{lib.breathing}</p></Block>
              <Block title="Músculos trabalhados" icon="target">
                <div className="flex flex-wrap gap-2">
                  <span className="chip on">Principal: {lib.group}</span>
                  {lib.secondary.map((m) => <span key={m} className="chip">Secundário: {m}</span>)}
                </div>
              </Block>
              <Block title="Erros comuns" icon="x"><ul className="list-disc pl-5 space-y-1 text-[15px]">{lib.mistakes.map((m) => <li key={m}>{m}</li>)}</ul></Block>
              <Block title="Dicas" icon="star"><ul className="list-disc pl-5 space-y-1 text-[15px]">{lib.tips.map((m) => <li key={m}>{m}</li>)}</ul></Block>
              <Block title="Cuidados" icon="alert">
                <ul className="space-y-1.5">{lib.cautions.map((m) => <li key={m} className="text-[15px] rounded-xl bg-[color-mix(in_srgb,var(--miss)_14%,transparent)] px-3 py-2">{m}</li>)}</ul>
              </Block>
            </>
          ) : (
            <>
              {ex.customSteps && ex.customSteps.filter(Boolean).length > 0 && (
                <Block title="Como executar" icon="list">
                  <ol className="space-y-2.5">{ex.customSteps.filter(Boolean).map((s, i) => (
                    <li key={i} className="flex gap-3 text-[15px]"><b className="w-6 h-6 rounded-full bg-accent text-onaccent text-xs grid place-items-center shrink-0 mt-0.5">{i + 1}</b><span>{s}</span></li>
                  ))}</ol>
                </Block>
              )}
              {ex.notes && <Block title="Observações" icon="info"><p className="text-[15px] whitespace-pre-wrap">{ex.notes}</p></Block>}
            </>
          )}
          <Block title="Sua evolução neste exercício" icon="chart"><ExerciseChart exerciseId={ex.id} /></Block>
        </div>
      )}
    </Modal>
  )
}

/* ---------------- escolher exercício ---------------- */
export function ExercisePicker({ open, onClose, onPick, title = 'Adicionar exercício', location }: { open: boolean; onClose: () => void; onPick: (ex: Ex) => void; title?: string; location?: Location }) {
  const catalog = useCatalog()
  const [q, setQ] = useState('')
  const [g, setG] = useState('Todos')
  const [loc, setLoc] = useState<'todos' | Location>(location ?? 'todos')
  const [detail, setDetail] = useState<Ex | null>(null)
  const [form, setForm] = useState(false)
  useEffect(() => { if (open) { setQ(''); setG('Todos'); setLoc(location ?? 'todos') } }, [open, location])
  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return catalog.filter((e) =>
      (g === 'Todos' || e.group === g) &&
      (loc === 'todos' || e.location.includes(loc)) &&
      (!n || e.name.toLowerCase().includes(n) || e.group.toLowerCase().includes(n) || (e.lib?.aliases ?? []).some((a) => a.includes(n))))
  }, [catalog, q, g, loc])
  return (
    <>
      <Modal open={open} onClose={onClose} title={title} wide>
        <div className="space-y-3">
          <div className="relative">
            <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input className="input !pl-10" placeholder="Buscar exercício ou músculo…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar exercício" />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {['Todos', ...GROUPS].map((x) => <button key={x} className={`chip whitespace-nowrap ${g === x ? 'on' : ''}`} onClick={() => setG(x)}>{x}</button>)}
          </div>
          <div className="seg">
            {(['todos', 'academia', 'casa'] as const).map((x) => <button key={x} className={loc === x ? 'on' : ''} onClick={() => setLoc(x)}>{x === 'todos' ? 'Todos' : LOC_LABEL[x]}</button>)}
          </div>
          <div className="space-y-2">
            {list.map((e) => (
              <div key={e.id} className="card-flat p-2.5 flex items-center gap-3">
                <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setDetail(e)} aria-label={`Ver como fazer ${e.name}`}>
                  <ExThumb ex={e} />
                  <span className="min-w-0">
                    <b className="block text-[15px] leading-tight truncate">{e.name}</b>
                    <span className="text-xs text-muted"><MuscleTag g={e.group} /> · {e.sets}×{e.reps}{e.unit === 'seg' ? ' s' : ''}{e.custom ? ' · seu' : ''}</span>
                  </span>
                </button>
                <button className="btn btn-soft btn-sm" onClick={() => { onPick(e); onClose() }}><Icon n="plus" size={16} />Adicionar</button>
              </div>
            ))}
            {!list.length && <p className="text-sm text-muted text-center py-6">Nenhum exercício encontrado. Que tal criar o seu?</p>}
          </div>
          <button className="btn w-full" onClick={() => setForm(true)}><Icon n="plus" />Criar exercício personalizado</button>
        </div>
      </Modal>
      <ExerciseDetail ex={detail} open={!!detail} onClose={() => setDetail(null)} onAdd={(e) => { onPick(e); onClose() }} />
      <ExerciseForm open={form} onClose={() => setForm(false)} onSaved={(c) => { onPick(c); onClose() }} />
    </>
  )
}

/* ---------------- exercício personalizado ---------------- */
const blank = (): Partial<CustomExercise> => ({ name: '', muscle_group: 'Peito', secondary: [], description: '', equipment: [], sets: 3, reps: '10', unit: 'reps', rest: 60, load: '', difficulty: 'iniciante', location: ['academia', 'casa'], notes: '', steps: [''], demo: '' })

export function ExerciseForm({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing?: CustomExercise | null; onSaved?: (e: Ex) => void }) {
  const toast = useToast()
  const [f, setF] = useState<Partial<CustomExercise>>(blank())
  const [eq, setEq] = useState('')
  useEffect(() => { if (open) { setF(editing ? { ...editing, steps: editing.steps?.length ? editing.steps : [''] } : blank()); setEq((editing?.equipment ?? []).join(', ')) } }, [open, editing])
  const set = <K extends keyof CustomExercise>(k: K, v: CustomExercise[K]) => setF((x) => ({ ...x, [k]: v }))
  const toggleLoc = (l: Location) => set('location', (f.location ?? []).includes(l) ? (f.location ?? []).filter((x) => x !== l) : [...(f.location ?? []), l])
  async function save() {
    if (!f.name?.trim()) { toast('Dê um nome ao exercício.', 'err'); return }
    const row = await put(db.custom_exercises, {
      ...f, id: f.id ?? uid(), name: f.name.trim(), equipment: eq.split(',').map((s) => s.trim()).filter(Boolean),
      steps: (f.steps ?? []).map((s) => s.trim()).filter(Boolean), location: (f.location?.length ? f.location : ['academia', 'casa']) as Location[],
    } as CustomExercise)
    toast(editing ? 'Exercício atualizado.' : 'Exercício criado.')
    const { fromCustom } = await import('../lib/catalog')
    onSaved?.(fromCustom(row))
    onClose()
  }
  const demoOptions = Object.keys(POSES)
  return (
    <Modal open={open} onClose={onClose} wide title={editing ? 'Editar exercício' : 'Novo exercício'} footer={<button className="btn btn-primary w-full" onClick={save}><Icon n="check" />Salvar exercício</button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Nome"><input className="input" value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Remada unilateral" /></Field></div>
        <Field label="Grupo muscular"><select className="select" value={f.muscle_group} onChange={(e) => set('muscle_group', e.target.value)}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Dificuldade"><select className="select" value={f.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>{(Object.keys(DIFF_LABEL) as Difficulty[]).map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}</select></Field>
        <Field label="Séries"><input className="input" inputMode="numeric" value={f.sets ?? 3} onChange={(e) => set('sets', Math.max(1, parseInt(e.target.value || '1', 10) || 1))} /></Field>
        <Field label={f.unit === 'seg' ? 'Tempo (segundos)' : 'Repetições'}><input className="input" value={f.reps ?? ''} onChange={(e) => set('reps', e.target.value)} placeholder="10 ou 8-12" /></Field>
        <Field label="Descanso (segundos)"><input className="input" inputMode="numeric" value={f.rest ?? 60} onChange={(e) => set('rest', parseInt(e.target.value || '0', 10) || 0)} /></Field>
        <Field label="Medida"><select className="select" value={f.unit} onChange={(e) => set('unit', e.target.value as 'reps' | 'seg')}><option value="reps">Repetições</option><option value="seg">Tempo (segundos)</option></select></Field>
        <Field label="Carga habitual (opcional)"><input className="input" value={f.load ?? ''} onChange={(e) => set('load', e.target.value)} placeholder="Ex.: 12 kg" /></Field>
        <Field label="Equipamentos (separe por vírgula)"><input className="input" value={eq} onChange={(e) => setEq(e.target.value)} placeholder="Halter, banco" /></Field>
        <div className="sm:col-span-2">
          <span className="label">Onde pode ser feito</span>
          <div className="flex gap-2">{(['academia', 'casa'] as Location[]).map((l) => <button key={l} className={`chip ${(f.location ?? []).includes(l) ? 'on' : ''}`} onClick={() => toggleLoc(l)}>{LOC_LABEL[l]}</button>)}</div>
        </div>
        <div className="sm:col-span-2"><Field label="Descrição"><textarea className="textarea" value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field></div>
        <div className="sm:col-span-2">
          <span className="label">Passo a passo</span>
          <div className="space-y-2">
            {(f.steps ?? ['']).map((s, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" value={s} placeholder={`Passo ${i + 1}`} onChange={(e) => set('steps', (f.steps ?? []).map((x, k) => (k === i ? e.target.value : x)))} />
                <button className="btn btn-icon" aria-label="Remover passo" onClick={() => set('steps', (f.steps ?? []).filter((_, k) => k !== i))}><Icon n="x" size={16} /></button>
              </div>
            ))}
            <button className="btn btn-sm" onClick={() => set('steps', [...(f.steps ?? []), ''])}><Icon n="plus" size={16} />Adicionar passo</button>
          </div>
        </div>
        <div className="sm:col-span-2"><Field label="Observações"><textarea className="textarea" value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field></div>
        <div className="sm:col-span-2">
          <Field label="Animação demonstrativa (opcional)" hint="Escolha só se o movimento for realmente igual. Sem escolha, o app mostra apenas as instruções.">
            <select className="select" value={f.demo ?? ''} onChange={(e) => set('demo', e.target.value)}>
              <option value="">Nenhuma (somente instruções)</option>
              {demoOptions.map((d) => <option key={d} value={d}>{d.replaceAll('-', ' ')}</option>)}
            </select>
          </Field>
          {f.demo && POSES[f.demo] && <div className="mt-2 max-w-xs"><DemoPlayer demo={POSES[f.demo]} group={f.muscle_group ?? 'Corpo todo'} controls={false} /></div>}
        </div>
      </div>
    </Modal>
  )
}

export async function deleteCustom(id: string) { await softDelete(db.custom_exercises, id) }
export function useDeleteCustom() {
  const confirm = useConfirm()
  const toast = useToast()
  return async (c: CustomExercise) => {
    if (await confirm({ title: 'Excluir exercício?', text: `"${c.name}" será removido da biblioteca. Treinos já realizados continuam no histórico.`, ok: 'Excluir', danger: true })) {
      await deleteCustom(c.id)
      toast('Exercício excluído.')
    }
  }
}
