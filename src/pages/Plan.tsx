import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Empty, Field, Icon, Modal, PageHeader, Spinner, useConfirm, useToast } from '../components/ui'
import { ExThumb, ExercisePicker, ExerciseDetail } from '../components/exercise'
import { SortableList } from '../components/Sortable'
import { VideoImport } from '../components/VideoImport'
import { db, alive, getProfile, put } from '../lib/db'
import { DIAS, addDays, fmtShort, fmtWeek, parseKey, todayKey, weekDays, weekStart } from '../lib/dates'
import {
  STATUS_LABEL, addExercise, cancelWorkout, copyWeek, createWorkout, deleteWorkout, duplicateItem, duplicateWorkout, groupItems, itemFromEx, listTemplates,
  moveWorkout, removeItem, reorderItems, replaceItem, statusOf, updateItem, type DayStatus,
} from '../lib/plan'
import { startSession } from '../lib/session'
import { findIn, useCatalog, type Ex } from '../lib/catalog'
import { LIB_BY_ID } from '../data/library'
import type { PlannedItem, PlannedWorkout, Session, Video } from '../lib/types'

const STATUS_TONE: Record<DayStatus, string> = {
  planejado: 'bg-[color-mix(in_srgb,var(--plan)_16%,transparent)] text-plan',
  realizado: 'bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] text-ok',
  'nao-realizado': 'bg-[color-mix(in_srgb,var(--miss)_18%,transparent)] text-miss',
  cancelado: 'bg-surface2 text-muted',
}

const KINDS = ['Pernas e glúteos', 'Peito e tríceps', 'Costas e bíceps', 'Ombros', 'Superiores', 'Corpo todo', 'Abdômen', 'Cardio']

export default function Plan() {
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const catalog = useCatalog()
  const [sp, setSp] = useSearchParams()
  const [anchor, setAnchor] = useState(todayKey())
  const [openId, setOpenId] = useState<string | null>(sp.get('w'))
  const [pickFor, setPickFor] = useState<string | null>(null)
  const [replaceFor, setReplaceFor] = useState<PlannedItem | null>(null)
  const [videoFor, setVideoFor] = useState<string | null>(null)
  const [dateAsk, setDateAsk] = useState<{ mode: 'dup' | 'move' | 'copyweek' | 'tpl'; id?: string } | null>(null)
  const [tplDay, setTplDay] = useState<string | null>(null)
  const today = todayKey()
  const days = weekDays(anchor)

  const data = useLiveQuery(async () => {
    const ws = alive(await db.planned_workouts.where('date').anyOf(days).toArray()).filter((w) => !w.template)
    const items = ws.length ? alive(await db.planned_items.where('workout_id').anyOf(ws.map((w) => w.id)).toArray()) : []
    const sessions = alive(await db.sessions.toArray()).filter((s) => s.status === 'finished')
    return { ws, items, sessions }
  }, [anchor], undefined)

  // abre o treino indicado na URL (?w=) na semana correta
  useEffect(() => {
    const id = sp.get('w')
    if (!id) return
    void db.planned_workouts.get(id).then((w) => { if (w?.date) { setAnchor(w.date); setOpenId(id) } })
    setSp({}, { replace: true })
  }, [sp, setSp])

  const templates = useLiveQuery(() => listTemplates(), [], [])
  if (!data) return <Spinner />

  const isThisWeek = weekStart(anchor) === weekStart(today)

  async function newWorkout(date: string) {
    const prof = await getProfile()
    const w = await createWorkout(date, { name: 'Treino', location: prof.preferred_location === 'casa' ? 'casa' : 'academia' })
    setOpenId(w.id)
    toast('Treino criado. Adicione os exercícios.')
  }

  async function onDatePicked(date: string) {
    const a = dateAsk
    setDateAsk(null)
    if (!a) return
    if (a.mode === 'dup' && a.id) { const nw = await duplicateWorkout(a.id, date, false, ''); if (nw) { toast(`Treino duplicado para ${fmtShort(date)}.`); setAnchor(date); setOpenId(nw.id) } }
    if (a.mode === 'move' && a.id) { await moveWorkout(a.id, date); toast(`Treino movido para ${fmtShort(date)}.`); setAnchor(date) }
    if (a.mode === 'copyweek') { const n = await copyWeek(date, anchor); toast(n ? `${n} treino${n > 1 ? 's' : ''} copiado${n > 1 ? 's' : ''} para esta semana.` : 'Nada para copiar (ou os dias já têm treino).', n ? 'ok' : 'info') }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Planejamento" title="Minha semana" right={<button className="btn btn-primary" onClick={() => newWorkout(isThisWeek ? today : days[0])}><Icon n="plus" /><span className="hidden sm:inline">Novo treino</span></button>} />

      <div className="flex items-center gap-2">
        <button className="btn btn-icon" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Semana anterior"><Icon n="chevL" /></button>
        <div className="flex-1 text-center"><b className="block">{fmtWeek(anchor)}</b><span className="text-xs text-muted">{isThisWeek ? 'Esta semana' : weekStart(anchor) > weekStart(today) ? 'Semana futura' : 'Semana passada'}</span></div>
        <button className="btn btn-icon" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Próxima semana"><Icon n="chevR" /></button>
        {!isThisWeek && <button className="btn btn-sm" onClick={() => setAnchor(today)}>Hoje</button>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-sm" onClick={async () => {
          const n = await copyWeek(addDays(weekStart(anchor), -7), anchor)
          toast(n ? `${n} treino${n > 1 ? 's' : ''} copiado${n > 1 ? 's' : ''} da semana anterior.` : 'A semana anterior não tem treinos para copiar (ou os dias já estão preenchidos).', n ? 'ok' : 'info')
        }}><Icon n="copy" size={16} />Copiar semana anterior</button>
        <button className="btn btn-sm" onClick={() => setDateAsk({ mode: 'copyweek' })}><Icon n="calendar" size={16} />Copiar de outra semana</button>
        <button className="btn btn-sm" onClick={() => setVideoFor('new')}><Icon n="video" size={16} />Importar de vídeo</button>
      </div>

      <p className="text-sm text-muted rounded-2xl bg-accentsoft/60 px-4 py-3 flex gap-2.5"><Icon n="info" size={18} className="shrink-0 mt-0.5 text-accentink" /><span>Dica: muita gente planeja a próxima semana no domingo, mas é só uma sugestão. Você pode criar, mudar, mover ou cancelar treinos a qualquer momento — treinos já realizados nunca são alterados.</span></p>

      <div className="space-y-4">
        {days.map((day) => {
          const ws = data.ws.filter((w) => w.date === day)
          const dd = parseKey(day)
          return (
            <section key={day} aria-label={`${DIAS[dd.getDay()]}, ${fmtShort(day)}`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <b className="text-[17px]">{DIAS[dd.getDay()]}</b>
                  <span className="text-sm text-muted tnum">{fmtShort(day)}</span>
                  {day === today && <span className="chip on">Hoje</span>}
                </div>
                <div className="flex gap-1.5">
                  {!!templates?.length && <button className="btn btn-sm" onClick={() => setTplDay(day)}><Icon n="layers" size={15} />Modelo</button>}
                  <button className="btn btn-sm btn-soft" onClick={() => newWorkout(day)}><Icon n="plus" size={15} />Treino</button>
                </div>
              </div>
              {ws.length === 0 ? (
                <div className="card-flat px-4 py-3 text-sm text-muted flex items-center gap-2"><Icon n="moon" size={16} />Dia livre — sem treino planejado.</div>
              ) : (
                <div className="space-y-3">
                  {ws.map((w) => (
                    <WorkoutCard key={w.id} w={w} items={data.items.filter((i) => i.workout_id === w.id).sort((a, b) => a.position - b.position)} sessions={data.sessions}
                      open={openId === w.id} onToggle={() => setOpenId(openId === w.id ? null : w.id)}
                      onAdd={() => setPickFor(w.id)} onVideo={() => setVideoFor(w.id)} onReplace={(it) => setReplaceFor(it)}
                      onAsk={(mode) => setDateAsk({ mode, id: w.id })}
                      onStart={async () => { try { const s = await startSession({ plannedWorkoutId: w.id }); nav(`/treino/${s.id}`) } catch { toast('Já existe um treino em andamento.', 'err') } }} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <ExercisePicker open={!!pickFor} onClose={() => setPickFor(null)} onPick={async (e) => { if (pickFor) { await addExercise(pickFor, e); toast(`${e.name} adicionado.`) } }} />
      <ExercisePicker open={!!replaceFor} onClose={() => setReplaceFor(null)} title="Substituir exercício" onPick={async (e) => { if (replaceFor) { await replaceItem(replaceFor.id, e); toast(`Substituído por ${e.name}. O histórico não muda.`) } }} />
      <VideoImport open={!!videoFor} onClose={() => setVideoFor(null)} onAdd={async (rows, video: Video) => {
        let wid = videoFor!
        if (wid === 'new') { const w = await createWorkout(isThisWeek ? today : days[0], { name: video.title || 'Treino do vídeo', video_id: video.id }); wid = w.id; setOpenId(w.id) }
        else await put(db.planned_workouts, { id: wid, video_id: video.id })
        for (const r of rows) {
          const base = itemFromEx(r.ex, wid, 0)
          const items = await db.planned_items.where('workout_id').equals(wid).filter((x) => !x.deleted).count()
          await put(db.planned_items, { ...base, position: items, sets: r.sets ?? r.ex.sets, reps: r.reps || r.ex.reps, notes: r.note } as PlannedItem)
        }
        toast(`${rows.length} exercício${rows.length > 1 ? 's' : ''} adicionado${rows.length > 1 ? 's' : ''} ao planejamento.`)
      }} />
      <DatePickModal state={dateAsk} anchor={anchor} onClose={() => setDateAsk(null)} onPick={onDatePicked} />
      <Modal open={!!tplDay} onClose={() => setTplDay(null)} title="Usar um modelo de treino">
        <div className="space-y-2">
          {(templates ?? []).map((t) => (
            <div key={t.id} className="card-flat p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0"><b className="block truncate">{t.name}</b><span className="text-xs text-muted">{t.kind || 'Modelo'} · {t.location === 'casa' ? 'Em casa' : 'Academia'}</span></div>
              <button className="btn btn-soft btn-sm" onClick={async () => { const nw = await duplicateWorkout(t.id, tplDay!, false); setTplDay(null); if (nw) { setOpenId(nw.id); toast('Modelo aplicado.') } }}>Usar</button>
              <button className="btn btn-icon !w-9 !min-h-9" aria-label="Excluir modelo" onClick={async () => { if (await confirm({ title: 'Excluir modelo?', ok: 'Excluir', danger: true })) await deleteWorkout(t.id) }}><Icon n="trash" size={16} /></button>
            </div>
          ))}
        </div>
      </Modal>
      <span className="hidden">{catalog.length}</span>
    </div>
  )
}

function DatePickModal({ state, anchor, onClose, onPick }: { state: { mode: string } | null; anchor: string; onClose: () => void; onPick: (d: string) => void }) {
  const [v, setV] = useState(anchor)
  useEffect(() => { if (state) setV(state.mode === 'copyweek' ? addDays(weekStart(anchor), -7) : anchor) }, [state, anchor])
  const title = state?.mode === 'dup' ? 'Duplicar para qual dia?' : state?.mode === 'move' ? 'Mover para qual dia?' : 'Copiar treinos de qual semana?'
  return (
    <Modal open={!!state} onClose={onClose} title={title} footer={<button className="btn btn-primary w-full" onClick={() => onPick(v)}>Confirmar</button>}>
      <div className="space-y-4">
        {state?.mode !== 'copyweek' && (
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays(anchor).map((d) => (
              <button key={d} className={`rounded-xl py-2 text-center border ${v === d ? 'bg-accent text-onaccent border-transparent' : 'border-line bg-surface'}`} onClick={() => setV(d)}>
                <div className="text-[10px] font-bold opacity-80">{DIAS[parseKey(d).getDay()].slice(0, 3)}</div><div className="font-bold tnum">{parseKey(d).getDate()}</div>
              </button>
            ))}
          </div>
        )}
        <Field label={state?.mode === 'copyweek' ? 'Qualquer dia da semana de origem' : 'Ou escolha outra data'}><input type="date" className="input" value={v} onChange={(e) => e.target.value && setV(e.target.value)} /></Field>
        {state?.mode === 'copyweek' && <p className="text-sm text-muted">Os treinos serão copiados para a semana atual do planejamento. Dias que já têm treino não são alterados.</p>}
      </div>
    </Modal>
  )
}

function WorkoutCard({ w, items, sessions, open, onToggle, onAdd, onVideo, onReplace, onAsk, onStart }: {
  w: PlannedWorkout; items: PlannedItem[]; sessions: Session[]; open: boolean; onToggle: () => void; onAdd: () => void; onVideo: () => void
  onReplace: (it: PlannedItem) => void; onAsk: (m: 'dup' | 'move') => void; onStart: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const status = statusOf(w, sessions)
  const [editing, setEditing] = useState<string | null>(null)
  const [detail, setDetail] = useState<Ex | null>(null)
  const [menu, setMenu] = useState(false)
  const catalog = useCatalog()
  const [name, setName] = useState(w.name)
  useEffect(() => setName(w.name), [w.name])
  const video = useLiveQuery(async () => (w.video_id ? db.videos.get(w.video_id) : undefined), [w.video_id])
  const groups = useMemo(() => new Set(items.map((i) => i.group_id).filter(Boolean)), [items])
  void groups

  return (
    <article className={`card ${w.cancelled ? 'opacity-70' : ''}`}>
      <button className="w-full text-left p-4 flex items-center gap-3" onClick={onToggle} aria-expanded={open}>
        <div className="w-11 h-11 rounded-2xl bg-accentsoft text-accentink grid place-items-center shrink-0"><Icon n={w.location === 'casa' ? 'home' : 'dumbbell'} /></div>
        <div className="min-w-0 flex-1">
          <b className="block text-[16px] leading-tight truncate">{w.name}</b>
          <span className="text-xs text-muted">{w.kind || 'Treino'} · {w.location === 'casa' ? 'Em casa' : 'Academia'} · {items.length} exercício{items.length === 1 ? '' : 's'}</span>
        </div>
        <span className={`chip ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
        <Icon n={open ? 'chevU' : 'chevD'} className="text-muted" />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-line pt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome do treino"><input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== w.name && put(db.planned_workouts, { id: w.id, name: name.trim() })} /></Field>
            <Field label="Tipo de treino"><input className="input" list="kinds" value={w.kind} onChange={(e) => put(db.planned_workouts, { id: w.id, kind: e.target.value })} placeholder="Ex.: Pernas e glúteos" /><datalist id="kinds">{KINDS.map((k) => <option key={k} value={k} />)}</datalist></Field>
          </div>
          <div>
            <span className="label">Local</span>
            <div className="seg">
              <button className={w.location === 'academia' ? 'on' : ''} onClick={() => put(db.planned_workouts, { id: w.id, location: 'academia' })}><Icon n="dumbbell" size={15} className="inline mr-1.5" />Academia</button>
              <button className={w.location === 'casa' ? 'on' : ''} onClick={() => put(db.planned_workouts, { id: w.id, location: 'casa' })}><Icon n="home" size={15} className="inline mr-1.5" />Em casa</button>
            </div>
          </div>

          {video && <a className="card-flat p-3 flex items-center gap-3 text-sm" href={video.url} target="_blank" rel="noopener noreferrer"><Icon n="video" className="text-accentink" /><span className="min-w-0"><b className="block truncate">{video.title || 'Vídeo do treino'}</b><span className="text-xs text-muted truncate block">{video.url}</span>{video.notes && <span className="text-xs block mt-1">{video.notes}</span>}</span></a>}

          {items.length === 0 ? (
            <Empty icon="dumbbell" title="Nenhum exercício ainda" text="Adicione exercícios da biblioteca, crie os seus ou importe de um vídeo." />
          ) : (
            <SortableList items={items} onReorder={(ids) => reorderItems(w.id, ids)}>
              {(it, handle, idx) => {
                const lib = LIB_BY_ID[it.exercise_id]
                const ex = findIn(catalog, it.exercise_id)
                const grouped = !!it.group_id
                return (
                  <div className={`card-flat ${grouped ? 'border-l-4 !border-l-accent' : ''}`}>
                    <div className="p-2 flex items-center gap-2">
                      {handle}
                      <button className="flex items-center gap-3 min-w-0 flex-1 text-left" onClick={() => ex && setDetail(ex)} aria-label={`Como fazer ${it.name}`}>
                        <ExThumb ex={{ demo: lib?.demo ?? ex?.demo, group: it.muscle_group }} size={46} />
                        <span className="min-w-0">
                          <b className="block text-[15px] leading-tight truncate">{it.name}</b>
                          <span className="text-xs text-muted tnum">{it.sets} × {it.reps}{it.unit === 'seg' ? ' s' : ''} · {it.rest}s descanso{it.load ? ` · ${it.load}` : ''}{grouped ? ` · ${it.group_kind === 'circuito' ? 'circuito' : 'supersérie'}` : ''}</span>
                        </span>
                      </button>
                      <button className="btn btn-icon !w-9 !min-h-9" onClick={() => setEditing(editing === it.id ? null : it.id)} aria-label="Editar séries e repetições"><Icon n="edit" size={16} /></button>
                    </div>
                    {editing === it.id && (
                      <div className="px-3 pb-3 space-y-3 border-t border-line pt-3">
                        <div className="grid grid-cols-4 gap-2">
                          <Field label="Séries"><input className="input" inputMode="numeric" value={it.sets} onChange={(e) => updateItem(it.id, { sets: Math.max(1, parseInt(e.target.value || '1', 10) || 1) })} /></Field>
                          <Field label={it.unit === 'seg' ? 'Segundos' : 'Reps'}><input className="input" value={it.reps} onChange={(e) => updateItem(it.id, { reps: e.target.value })} /></Field>
                          <Field label="Desc. (s)"><input className="input" inputMode="numeric" value={it.rest} onChange={(e) => updateItem(it.id, { rest: parseInt(e.target.value || '0', 10) || 0 })} /></Field>
                          <Field label="Carga"><input className="input" value={it.load} onChange={(e) => updateItem(it.id, { load: e.target.value })} placeholder="kg" /></Field>
                        </div>
                        <Field label="Observações"><input className="input" value={it.notes} onChange={(e) => updateItem(it.id, { notes: e.target.value })} /></Field>
                        <div className="flex flex-wrap gap-2">
                          <button className="btn btn-sm" onClick={() => onReplace(it)}><Icon n="swap" size={15} />Substituir</button>
                          <button className="btn btn-sm" onClick={() => duplicateItem(it.id)}><Icon n="copy" size={15} />Duplicar</button>
                          {grouped
                            ? <button className="btn btn-sm" onClick={() => groupItems(items.filter((x) => x.group_id === it.group_id).map((x) => x.id), null)}><Icon n="layers" size={15} />Desagrupar</button>
                            : idx < items.length - 1 && <button className="btn btn-sm" onClick={() => groupItems([it.id, items[idx + 1].id], 'superserie')}><Icon n="layers" size={15} />Supersérie com o próximo</button>}
                          <button className="btn btn-sm btn-danger" onClick={() => removeItem(it.id)}><Icon n="trash" size={15} />Remover</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }}
            </SortableList>
          )}

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-soft" onClick={onAdd}><Icon n="plus" />Adicionar exercício</button>
            <button className="btn" onClick={onVideo}><Icon n="video" />Vídeo</button>
            <button className="btn btn-icon" onClick={() => setMenu(true)} aria-label="Mais opções do treino"><Icon n="more" /></button>
            {!w.cancelled && <button className="btn btn-primary ml-auto" disabled={!items.length} onClick={onStart}><Icon n="play" />Iniciar</button>}
          </div>
        </div>
      )}

      <ExerciseDetail ex={detail} open={!!detail} onClose={() => setDetail(null)} />
      <Modal open={menu} onClose={() => setMenu(false)} title={w.name}>
        <div className="grid gap-2">
          <button className="btn justify-start" onClick={() => { setMenu(false); onAsk('dup') }}><Icon n="copy" />Duplicar para outro dia</button>
          <button className="btn justify-start" onClick={() => { setMenu(false); onAsk('move') }}><Icon n="calendar" />Mover para outro dia</button>
          <button className="btn justify-start" onClick={async () => { await duplicateWorkout(w.id, null, true, ''); setMenu(false); toast('Salvo como modelo. Use em qualquer dia pelo botão "Modelo".') }}><Icon n="layers" />Salvar como modelo</button>
          <button className="btn justify-start" onClick={async () => { await cancelWorkout(w.id, !w.cancelled); setMenu(false) }}><Icon n="x" />{w.cancelled ? 'Reativar treino' : 'Cancelar treino'}</button>
          <button className="btn justify-start btn-danger" onClick={async () => {
            setMenu(false)
            if (await confirm({ title: 'Excluir treino planejado?', text: 'Treinos já realizados a partir dele continuam no histórico.', ok: 'Excluir', danger: true })) { await deleteWorkout(w.id); toast('Treino excluído.') }
          }}><Icon n="trash" />Excluir treino</button>
        </div>
      </Modal>
    </article>
  )
}
