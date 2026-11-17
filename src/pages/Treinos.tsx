import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Empty, Field, Icon, Modal, PageHeader, useConfirm, useToast } from '../components/ui'
import { ExThumb, ExerciseDetail, ExerciseForm, LOC_LABEL, MuscleTag, DIFF_LABEL, useDeleteCustom } from '../components/exercise'
import { GROUPS, GROUP_COLOR } from '../data/library'
import { POSES } from '../data/poses'
import { StaticFigure } from '../components/Figure'
import { useCatalog, type Ex } from '../lib/catalog'
import { db, alive, put } from '../lib/db'
import { addExercise, createWorkout, deleteWorkout, duplicateWorkout, itemsOf, listTemplates, workoutsOn } from '../lib/plan'
import { fmtDay, todayKey } from '../lib/dates'
import type { CustomExercise, Location } from '../lib/types'

export default function Treinos() {
  const [tab, setTab] = useState<'biblioteca' | 'modelos'>('biblioteca')
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Treinos" title="Biblioteca e modelos" />
      <div className="seg"><button className={tab === 'biblioteca' ? 'on' : ''} onClick={() => setTab('biblioteca')}>Exercícios</button><button className={tab === 'modelos' ? 'on' : ''} onClick={() => setTab('modelos')}>Meus treinos</button></div>
      {tab === 'biblioteca' ? <Library /> : <Templates />}
    </div>
  )
}

function Library() {
  const nav = useNavigate()
  const toast = useToast()
  const catalog = useCatalog()
  const custom = useLiveQuery(async () => alive(await db.custom_exercises.toArray()), [], [])
  const del = useDeleteCustom()
  const [q, setQ] = useState('')
  const [g, setG] = useState('Todos')
  const [loc, setLoc] = useState<'todos' | Location>('todos')
  const [mine, setMine] = useState(false)
  const [detail, setDetail] = useState<Ex | null>(null)
  const [form, setForm] = useState<{ open: boolean; editing: CustomExercise | null }>({ open: false, editing: null })

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return catalog.filter((e) => (g === 'Todos' || e.group === g) && (loc === 'todos' || e.location.includes(loc)) && (!mine || e.custom) &&
      (!n || e.name.toLowerCase().includes(n) || e.group.toLowerCase().includes(n) || (e.lib?.aliases ?? []).some((a) => a.includes(n)) || e.equipment.join(' ').toLowerCase().includes(n)))
  }, [catalog, q, g, loc, mine])

  async function addToToday(e: Ex) {
    const today = todayKey()
    let w = (await workoutsOn(today)).find((x) => !x.cancelled)
    if (!w) w = await createWorkout(today, { name: 'Treino de hoje' })
    await addExercise(w.id, e)
    toast(`${e.name} adicionado ao treino de hoje.`)
    nav(`/plano?w=${w.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input className="input !pl-10" placeholder="Buscar exercício, músculo ou equipamento" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar exercício" />
        </div>
        <button className="btn btn-primary" onClick={() => setForm({ open: true, editing: null })}><Icon n="plus" /><span className="hidden sm:inline">Criar</span></button>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {['Todos', ...GROUPS].map((x) => <button key={x} className={`chip whitespace-nowrap ${g === x ? 'on' : ''}`} onClick={() => setG(x)}>{x}</button>)}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <div className="seg">{(['todos', 'academia', 'casa'] as const).map((x) => <button key={x} className={loc === x ? 'on' : ''} onClick={() => setLoc(x)}>{x === 'todos' ? 'Todos' : LOC_LABEL[x]}</button>)}</div>
        <button className={`chip ${mine ? 'on' : ''}`} onClick={() => setMine(!mine)}>Criados por mim ({custom?.length ?? 0})</button>
        <span className="text-xs text-muted ml-auto">{list.length} exercício{list.length === 1 ? '' : 's'}</span>
      </div>

      {list.length === 0 ? <Empty icon="search" title="Nada encontrado" text="Tente outro termo ou limpe os filtros. Você também pode criar um exercício personalizado." /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {list.map((e) => (
            <div key={e.id} className="card-flat overflow-hidden relative active:scale-[.98] transition">
              <button className="block w-full text-left" onClick={() => setDetail(e)} aria-label={`Abrir ${e.name}`}>
                <div className="aspect-[4/3] grid place-items-center" style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${GROUP_COLOR[e.group] ?? 'var(--accent)'} 14%, var(--surface)), var(--accent-soft))` }}>
                  {e.demo && POSES[e.demo] ? <StaticFigure demo={POSES[e.demo]} group={e.group} className="w-[88%] h-[88%]" /> : <Icon n="dumbbell" size={34} className="text-accentink" />}
                </div>
                <div className="p-3">
                  <b className="block text-[14px] leading-[18px] line-clamp-2 min-h-9">{e.name}</b>
                  <span className="mt-1.5 flex items-center justify-between gap-1 text-[11.5px] text-muted font-semibold">
                    <MuscleTag g={e.group} />
                    <span>{e.sets}×{e.reps}</span>
                  </span>
                </div>
              </button>
              <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${e.difficulty === 'iniciante' ? 'bg-ok text-white' : e.difficulty === 'intermediario' ? 'bg-miss text-white' : 'bg-danger text-white'}`}>{DIFF_LABEL[e.difficulty]}</span>
              {e.custom && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <button className="btn btn-icon !w-8 !min-h-8 !rounded-lg" aria-label="Editar" onClick={() => setForm({ open: true, editing: custom!.find((c) => c.id === e.id) ?? null })}><Icon n="edit" size={14} /></button>
                  <button className="btn btn-icon !w-8 !min-h-8 !rounded-lg" aria-label="Excluir" onClick={() => del(custom!.find((c) => c.id === e.id)!)}><Icon n="trash" size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ExerciseDetail ex={detail} open={!!detail} onClose={() => setDetail(null)} onAdd={addToToday} addLabel="Adicionar ao treino de hoje" />
      <ExerciseForm open={form.open} editing={form.editing} onClose={() => setForm({ open: false, editing: null })} />
    </div>
  )
}

function Templates() {
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()
  const tpls = useLiveQuery(async () => {
    const t = await listTemplates()
    return Promise.all(t.map(async (w) => ({ w, items: await itemsOf(w.id) })))
  }, [], undefined)
  const [use, setUse] = useState<string | null>(null)
  const [date, setDate] = useState(todayKey())
  const [open, setOpen] = useState<string | null>(null)

  async function create() {
    const w = await createWorkout(null, { template: true, name: 'Novo modelo' })
    setOpen(w.id)
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Modelos são treinos salvos que você pode aplicar em qualquer dia. Para criar um, abra um treino no Planejamento e escolha "Salvar como modelo".</p>
      {tpls && tpls.length === 0 && <Empty icon="layers" title="Nenhum modelo salvo" text="Salve seus treinos favoritos como modelo e reutilize quando quiser." action={<button className="btn btn-soft" onClick={create}>Criar modelo vazio</button>} />}
      {tpls?.map(({ w, items }) => (
        <div key={w.id} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accentsoft text-accentink grid place-items-center"><Icon n="layers" /></div>
            <button className="flex-1 min-w-0 text-left" onClick={() => setOpen(open === w.id ? null : w.id)}>
              <b className="block truncate">{w.name}</b>
              <span className="text-xs text-muted">{w.kind || 'Modelo'} · {w.location === 'casa' ? 'Em casa' : 'Academia'} · {items.length} exercício{items.length === 1 ? '' : 's'}</span>
            </button>
            <button className="btn btn-soft btn-sm" onClick={() => setUse(w.id)}>Usar</button>
          </div>
          {open === w.id && (
            <div className="mt-3 pt-3 border-t border-line space-y-3">
              <Field label="Nome"><input className="input" defaultValue={w.name} onBlur={(e) => e.target.value.trim() && put(db.planned_workouts, { id: w.id, name: e.target.value.trim() })} /></Field>
              <ul className="space-y-1.5">{items.map((i) => <li key={i.id} className="text-sm flex justify-between gap-2"><span className="truncate">{i.name}</span><span className="text-muted tnum shrink-0">{i.sets} × {i.reps}</span></li>)}</ul>
              <button className="btn btn-danger btn-sm" onClick={async () => { if (await confirm({ title: 'Excluir modelo?', ok: 'Excluir', danger: true })) { await deleteWorkout(w.id); toast('Modelo excluído.') } }}><Icon n="trash" size={15} />Excluir modelo</button>
            </div>
          )}
        </div>
      ))}
      <Modal open={!!use} onClose={() => setUse(null)} title="Aplicar em qual dia?" footer={<button className="btn btn-primary w-full" onClick={async () => { const nw = await duplicateWorkout(use!, date, false); setUse(null); if (nw) { toast(`Aplicado em ${fmtDay(date)}.`); nav(`/plano?w=${nw.id}`) } }}>Aplicar</button>}>
        <input type="date" className="input" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Data" />
      </Modal>
    </div>
  )
}
