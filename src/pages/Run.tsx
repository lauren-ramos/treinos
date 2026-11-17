import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getProfile } from '../lib/db'
import {
  addExerciseToSession, addSet, adjustRest, discardSession, duplicateExercise, elapsedMs, endRest, finishSession, getSessionExercises, getSessionSets,
  groupExercises, pauseSession, removeExercise, removeSet, reorderExercises, replaceExercise, restLeftMs, restRunning, resumeSession, setCurrent,
  setSessionNotes, skipExercise, summarize, toggleSet, unskipExercise, updateSet, type SessionSummary,
} from '../lib/session'
import { compare, compareSet, lastPerformance, type Comparison, type Perf } from '../lib/progress'
import { findIn, fromLib, useCatalog, type Ex } from '../lib/catalog'
import { LIB_BY_ID } from '../data/library'
import { fmtClock, fmtDur } from '../lib/dates'
import { beep, keepAwake, notify, unlockAudio, vibrate } from '../lib/notify'
import { checkAchievements, type AchievementDef } from '../lib/stats'
import { ExVisual, ExerciseDetail, ExercisePicker } from '../components/exercise'
import { Icon, Modal, Spinner, useConfirm, useToast } from '../components/ui'
import { SortableList } from '../components/Sortable'
import type { Session, SessionExercise, SessionSet } from '../lib/types'

function useNow(ms: number) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return n
}

/** Campo numérico com rascunho local (evita pular o cursor enquanto grava a cada tecla). */
function NumInput({ value, onCommit, label, placeholder, step }: { value: number | null; onCommit: (v: number | null) => void; label: string; placeholder?: string; step?: string }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setDraft(value === null ? '' : String(value)) }, [value])
  return (
    <input
      className="input !min-h-12 !px-2 text-center text-lg font-bold tnum"
      inputMode={step === '1' ? 'numeric' : 'decimal'}
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      onFocus={(e) => { focused.current = true; e.target.select() }}
      onBlur={() => { focused.current = false; setDraft(value === null ? '' : String(value)) }}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.')
        if (!/^\d*\.?\d*$/.test(t)) return
        setDraft(t)
        onCommit(t === '' || t === '.' ? null : parseFloat(t))
      }}
    />
  )
}

const kgFmt = (n: number | null | undefined) => (n === null || n === undefined ? '–' : String(Math.round(n * 10) / 10).replace('.', ','))

export default function Run() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const catalog = useCatalog()
  const data = useLiveQuery(async () => {
    const s = await db.sessions.get(id)
    if (!s || s.deleted) return null
    return { s, ex: await getSessionExercises(id), sets: await getSessionSets(id) }
  }, [id], undefined)
  const profile = useLiveQuery(() => getProfile(), [], undefined)
  const now = useNow(250)
  const firedRef = useRef<number | null>(null)
  const [prev, setPrev] = useState<Perf | null>(null)
  const [detail, setDetail] = useState<Ex | null>(null)
  const [menu, setMenu] = useState(false)
  const [picker, setPicker] = useState<'add' | 'replace' | null>(null)
  const [order, setOrder] = useState(false)
  const [finishAsk, setFinishAsk] = useState(false)
  const [fresh, setFresh] = useState<AchievementDef[]>([])
  const [count, setCount] = useState<{ setId: string; end: number } | null>(null)

  const s = data?.s
  const ex = data?.ex ?? []
  const sets = data?.sets ?? []
  const idx = s ? Math.min(Math.max(s.current_index, 0), Math.max(ex.length - 1, 0)) : 0
  const cur = ex[idx]
  const curEx: Ex | undefined = cur ? findIn(catalog, cur.exercise_id) ?? (LIB_BY_ID[cur.exercise_id] ? fromLib(LIB_BY_ID[cur.exercise_id]) : {
    id: cur.exercise_id, name: cur.name, group: cur.muscle_group || 'Corpo todo', secondary: [], description: '', equipment: [], sets: cur.target_sets, reps: cur.target_reps,
    unit: cur.unit, rest: cur.rest, difficulty: 'iniciante', location: ['academia', 'casa'], loadable: true, custom: true, demo: '', notes: '',
  }) : undefined
  const curSets = useMemo(() => sets.filter((x) => cur && x.session_exercise_id === cur.id), [sets, cur])

  // referência da última execução
  useEffect(() => {
    let live = true
    if (cur) void lastPerformance(cur.exercise_id, id).then((p) => { if (live) setPrev(p) })
    else setPrev(null)
    return () => { live = false }
  }, [cur?.exercise_id, id]) // eslint-disable-line react-hooks/exhaustive-deps

  // manter a tela acesa durante o treino
  useEffect(() => {
    const on = !!s && s.status === 'active' && (profile?.keep_awake ?? true)
    void keepAwake(on)
    const vis = () => { if (document.visibilityState === 'visible') void keepAwake(on) }
    document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('visibilitychange', vis); void keepAwake(false) }
  }, [s?.status, profile?.keep_awake]) // eslint-disable-line react-hooks/exhaustive-deps

  // fim do descanso: aviso sonoro/vibração/notificação (uma única vez)
  useEffect(() => {
    if (!s || s.paused_at !== null || !s.rest_end_at) return
    if (now >= s.rest_end_at && firedRef.current !== s.rest_end_at) {
      firedRef.current = s.rest_end_at
      if (now - s.rest_end_at < 5000) {
        if (profile?.sound ?? true) beep()
        if (profile?.vibrate ?? true) vibrate()
        if (profile?.notifications && document.visibilityState === 'hidden') void notify('Descanso terminou', 'Hora da próxima série!')
      }
      void endRest(s.id)
    }
  }, [now, s, profile])

  // contagem regressiva de séries por tempo (prancha etc.)
  useEffect(() => {
    if (count && now >= count.end) {
      const set = sets.find((x) => x.id === count.setId)
      setCount(null)
      if (profile?.sound ?? true) beep()
      if (profile?.vibrate ?? true) vibrate()
      if (set && !set.done) void toggleSet(set.id)
    }
  }, [now, count, sets, profile])

  if (data === undefined) return <Spinner label="Abrindo treino…" />
  if (data === null || !s) { setTimeout(() => nav('/', { replace: true }), 0); return <Spinner /> }
  if (s.status === 'discarded') { setTimeout(() => nav('/', { replace: true }), 0); return <Spinner /> }
  if (s.status === 'finished') return <Summary s={s} fresh={fresh} />

  const paused = s.paused_at !== null
  const elapsed = elapsedMs(s, now) / 1000
  const doneCount = ex.filter((e) => e.status === 'done').length
  const skipped = ex.filter((e) => e.status === 'skipped').length
  const pct = ex.length ? ((doneCount + skipped) / ex.length) * 100 : 0
  const allDone = ex.length > 0 && ex.every((e) => e.status !== 'pending')
  const restLeft = restLeftMs(s, now) / 1000
  const resting = restRunning(s) && restLeft > 0
  const curDonePerf = curSets.filter((x) => x.done).map((x) => ({ reps: x.reps ?? 0, load: x.load ?? 0 }))
  const comp: Comparison = compare(curDonePerf, prev?.sets)
  const pendingSets = sets.filter((x) => !x.done && ex.some((e) => e.id === x.session_exercise_id && e.status !== 'skipped')).length

  async function doToggle(set: SessionSet) {
    unlockAudio()
    if (paused) { toast('O treino está pausado. Toque em Retomar.', 'info'); return }
    await toggleSet(set.id)
  }

  async function finish() {
    const done = await finishSession(s!.id)
    setFinishAsk(false)
    if (done) setFresh(await checkAchievements())
  }

  return (
    <div className="min-h-dvh bg-bg pb-40 safe-t">
      {/* topo */}
      <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-line px-4 pt-3 pb-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <button className="btn btn-icon" onClick={() => nav('/')} aria-label="Sair da tela do treino (o treino continua salvo)"><Icon n="chevL" /></button>
            <div className="min-w-0 flex-1">
              <b className="block truncate leading-tight">{s.name}</b>
              <span className="text-xs text-muted">Início às {fmtClock(s.started_at)}{paused ? ' · pausado' : ''}</span>
            </div>
            <button className="btn btn-icon" onClick={() => setOrder(true)} aria-label="Ordem dos exercícios"><Icon n="list" /></button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className={`text-[44px] leading-none font-extrabold tnum tracking-tight ${paused ? 'text-muted' : ''}`} aria-label="Tempo de treino" role="timer">{fmtDur(elapsed)}</div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => (paused ? resumeSession(s.id) : pauseSession(s.id))}><Icon n={paused ? 'play' : 'pause'} />{paused ? 'Retomar' : 'Pausar'}</button>
              <button className="btn btn-primary" onClick={() => setFinishAsk(true)}><Icon n="flag" />Finalizar</button>
            </div>
          </div>
          <div className="mt-2.5">
            <div className="pb"><i style={{ width: `${pct}%` }} /></div>
            <div className="text-xs text-muted mt-1 flex justify-between"><span>{doneCount} de {ex.length} exercícios concluídos{skipped ? ` · ${skipped} pulado${skipped > 1 ? 's' : ''}` : ''}</span><span>{Math.max(0, ex.length - doneCount - skipped)} restantes</span></div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {!ex.length && (
          <div className="card p-8 text-center space-y-3">
            <b className="text-lg">Treino livre</b>
            <p className="text-sm text-muted">Adicione os exercícios que quiser fazer agora.</p>
            <button className="btn btn-primary" onClick={() => setPicker('add')}><Icon n="plus" />Adicionar exercício</button>
          </div>
        )}

        {ex.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1" role="tablist" aria-label="Exercícios do treino">
            {ex.map((e, i) => (
              <button key={e.id} role="tab" aria-selected={i === idx} onClick={() => setCurrent(s.id, i)}
                className={`shrink-0 rounded-2xl px-3 py-2 text-left max-w-[170px] border transition ${i === idx ? 'bg-accent text-onaccent border-transparent shadow-md' : e.status === 'done' ? 'bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] border-transparent' : e.status === 'skipped' ? 'bg-surface2 opacity-60 border-transparent' : 'bg-surface border-line'}`}>
                <span className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">{e.status === 'done' ? <Icon n="check" size={13} /> : e.status === 'skipped' ? <Icon n="skip" size={12} /> : null}{i + 1}{e.group_id ? ' · série combinada' : ''}</span>
                <span className="block text-[13px] font-bold leading-tight truncate">{e.name}</span>
              </button>
            ))}
            <button className="shrink-0 rounded-2xl px-3 py-2 border border-dashed border-line text-muted font-bold text-[13px] flex items-center gap-1" onClick={() => setPicker('add')}><Icon n="plus" size={16} />Exercício</button>
          </div>
        )}

        {cur && curEx && (
          <section className="card p-4 space-y-4" aria-label={`Exercício atual: ${cur.name}`}>
            <ExVisual ex={curEx} />
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="h-eyebrow">{cur.status === 'done' ? 'Concluído' : cur.status === 'skipped' ? 'Pulado' : `Exercício ${idx + 1} de ${ex.length}`}</div>
                <h2 className="text-2xl font-extrabold leading-7 tracking-tight">{cur.name}</h2>
                <p className="text-sm text-muted mt-0.5">{cur.muscle_group} · meta {cur.target_sets} × {cur.target_reps}{cur.unit === 'seg' ? ' s' : ''} · descanso {cur.rest}s{cur.replaced_from ? ` · substitui ${cur.replaced_from}` : ''}</p>
              </div>
              <button className="btn btn-icon" onClick={() => setMenu(true)} aria-label="Opções do exercício"><Icon n="more" /></button>
            </div>
            <button className="btn btn-soft w-full" onClick={() => setDetail(curEx)}><Icon n="info" />Como fazer?</button>

            {/* referência do último treino */}
            <div className="rounded-2xl bg-surface2 p-3">
              <div className="text-xs font-bold text-muted mb-1.5">Último treino</div>
              {prev ? (
                <div className="flex flex-wrap gap-1.5">
                  {prev.sets.map((p, i) => <span key={i} className="chip !bg-surface tnum">S{i + 1}: {kgFmt(p.load)} kg × {p.reps}</span>)}
                </div>
              ) : <p className="text-sm text-muted">Primeira vez neste exercício: o que você registrar hoje será sua referência.</p>}
              {comp.tone !== 'none' && (
                <p className={`mt-2 text-sm font-bold flex items-start gap-1.5 ${comp.tone === 'up' ? 'text-ok' : comp.tone === 'down' ? 'text-miss' : comp.tone === 'mixed' ? 'text-plan' : 'text-muted'}`}>
                  <Icon n={comp.tone === 'up' ? 'arrowUp' : comp.tone === 'down' ? 'arrowDown' : comp.tone === 'mixed' ? 'swap' : 'equal'} size={16} className="mt-0.5 shrink-0" />{comp.message}
                </p>
              )}
            </div>

            {/* séries */}
            <div>
              <div className="grid grid-cols-[34px_1fr_1fr_52px] gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">
                <span>Série</span><span className="text-center">{cur.unit === 'seg' ? 'Segundos' : 'Repetições'}</span><span className="text-center">Carga (kg)</span><span />
              </div>
              <div className="space-y-2">
                {curSets.map((st, i) => {
                  const arrow = compareSet(st.done ? { reps: st.reps ?? 0, load: st.load ?? 0 } : undefined, prev?.sets[i])
                  const counting = count?.setId === st.id
                  return (
                    <div key={st.id} className={`grid grid-cols-[34px_1fr_1fr_52px] gap-2 items-center rounded-2xl p-1.5 transition ${st.done ? 'bg-[color-mix(in_srgb,var(--ok)_14%,transparent)]' : ''}`}>
                      <b className="text-center text-muted tnum">{i + 1}</b>
                      <NumInput value={st.reps} label={`Série ${i + 1}: ${cur.unit === 'seg' ? 'segundos' : 'repetições'}`} step="1" onCommit={(v) => updateSet(st.id, { reps: v === null ? null : Math.round(v) })} />
                      <div className="relative">
                        <NumInput value={st.load} label={`Série ${i + 1}: carga em quilos`} placeholder={prev?.sets[i] ? kgFmt(prev.sets[i].load) : '0'} onCommit={(v) => updateSet(st.id, { load: v })} />
                        {st.done && arrow !== 'none' && <span className={`absolute -top-1.5 -right-1 rounded-full w-5 h-5 grid place-items-center text-white ${arrow === 'up' ? 'bg-ok' : arrow === 'down' ? 'bg-miss' : 'bg-none'}`} aria-label={arrow === 'up' ? 'Melhor que a última vez' : arrow === 'down' ? 'Abaixo da última vez' : 'Igual à última vez'}><Icon n={arrow === 'up' ? 'arrowUp' : arrow === 'down' ? 'arrowDown' : 'equal'} size={12} stroke={3} /></span>}
                      </div>
                      {cur.unit === 'seg' && !st.done ? (
                        <button className={`btn !min-h-12 !px-0 ${counting ? 'btn-primary' : 'btn-soft'}`} onClick={() => { unlockAudio(); setCount(counting ? null : { setId: st.id, end: Date.now() + (st.reps ?? 30) * 1000 }) }} aria-label={counting ? 'Parar contagem' : 'Iniciar contagem regressiva da série'}>
                          {counting ? <span className="tnum text-sm">{Math.max(0, Math.ceil(((count?.end ?? 0) - now) / 1000))}</span> : <Icon n="play" size={18} />}
                        </button>
                      ) : (
                        <button className={`btn !min-h-12 !px-0 ${st.done ? '!bg-ok !text-white !border-transparent' : ''}`} onClick={() => doToggle(st)} aria-pressed={st.done} aria-label={st.done ? `Desmarcar série ${i + 1}` : `Concluir série ${i + 1}`}><Icon n="check" size={22} stroke={3} /></button>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn btn-sm flex-1" onClick={() => addSet(cur.id)}><Icon n="plus" size={16} />Série extra</button>
                <button className="btn btn-sm flex-1" disabled={curSets.length <= 1} onClick={() => removeSet(curSets[curSets.length - 1].id)}><Icon n="minus" size={16} />Remover série</button>
              </div>
            </div>

            <div className="flex gap-2">
              {cur.status === 'skipped'
                ? <button className="btn flex-1" onClick={() => unskipExercise(cur.id)}><Icon n="repeat" />Retomar exercício</button>
                : <button className="btn flex-1" onClick={() => skipExercise(cur.id)}><Icon n="skip" />Pular</button>}
              <button className="btn flex-1" disabled={idx >= ex.length - 1} onClick={() => setCurrent(s.id, idx + 1)}>Próximo<Icon n="chevR" /></button>
            </div>
          </section>
        )}

        {allDone && (
          <div className="card p-5 text-center space-y-3 border-ok">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[color-mix(in_srgb,var(--ok)_16%,transparent)] text-ok grid place-items-center"><Icon n="trophy" size={26} /></div>
            <b className="text-lg block">Todos os exercícios concluídos!</b>
            <button className="btn btn-primary w-full" onClick={() => setFinishAsk(true)}><Icon n="flag" />Finalizar treino</button>
          </div>
        )}
      </div>

      {/* descanso */}
      {resting && (
        <div className="fixed left-0 right-0 bottom-0 z-40 p-3 safe-b" role="region" aria-label="Descanso entre séries">
          <div className="max-w-xl mx-auto rounded-[28px] bg-[#2a1b25] text-white p-4 shadow-2xl page-in">
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1"><span>DESCANSO{s.rest_label ? ` · ${s.rest_label}` : ''}</span><span>{paused ? 'pausado' : ''}</span></div>
            <div className="flex items-center gap-4">
              <div className="text-[56px] font-extrabold leading-none tnum" role="timer" aria-live="off">{fmtDur(Math.ceil(restLeft))}</div>
              <div className="flex-1 h-2.5 rounded-full bg-white/15 overflow-hidden"><i className="block h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, (restLeft / Math.max(1, s.rest_total_s)) * 100)}%` }} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button className="btn !bg-white/10 !border-transparent !text-white" onClick={() => adjustRest(s.id, -15)}><Icon n="minus" size={16} />15s</button>
              <button className="btn !bg-white/10 !border-transparent !text-white" onClick={() => adjustRest(s.id, 15)}><Icon n="plus" size={16} />15s</button>
              <button className="btn btn-primary" onClick={() => endRest(s.id)}>Pular<Icon n="skip" size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* opções do exercício */}
      <Modal open={menu} onClose={() => setMenu(false)} title={cur?.name}>
        {cur && (
          <div className="grid gap-2">
            <button className="btn justify-start" onClick={() => { setMenu(false); setPicker('replace') }}><Icon n="swap" />Substituir por outro exercício</button>
            <button className="btn justify-start" onClick={async () => { await duplicateExercise(cur.id); setMenu(false); toast('Exercício duplicado.') }}><Icon n="copy" />Duplicar exercício</button>
            {idx < ex.length - 1 && (cur.group_id
              ? <button className="btn justify-start" onClick={async () => { await groupExercises(ex.filter((e) => e.group_id === cur.group_id).map((e) => e.id), null); setMenu(false) }}><Icon n="layers" />Desfazer série combinada</button>
              : <button className="btn justify-start" onClick={async () => { await groupExercises([cur.id, ex[idx + 1].id], 'superserie'); setMenu(false); toast(`Supersérie: ${cur.name} + ${ex[idx + 1].name}`) }}><Icon n="layers" />Criar supersérie com o próximo</button>)}
            <button className="btn justify-start" onClick={() => { setMenu(false); setOrder(true) }}><Icon n="drag" />Alterar ordem dos exercícios</button>
            <button className="btn justify-start btn-danger" onClick={async () => {
              setMenu(false)
              if (await confirm({ title: 'Remover do treino?', text: 'O exercício sai deste treino. Séries já concluídas continuam no histórico.', ok: 'Remover', danger: true })) await removeExercise(cur.id)
            }}><Icon n="trash" />Remover do treino</button>
          </div>
        )}
      </Modal>

      <ExercisePicker open={picker !== null} onClose={() => setPicker(null)} title={picker === 'replace' ? 'Substituir exercício' : 'Adicionar exercício'}
        onPick={async (e) => {
          if (picker === 'replace' && cur) { await replaceExercise(cur.id, e); toast(`${cur.name} substituído por ${e.name}.`) }
          else { await addExerciseToSession(s.id, e); const vis = await getSessionExercises(s.id); await setCurrent(s.id, vis.length - 1); toast(`${e.name} adicionado.`) }
        }} />
      <ExerciseDetail ex={detail} open={!!detail} onClose={() => setDetail(null)} />

      <Modal open={order} onClose={() => setOrder(false)} title="Ordem dos exercícios">
        <p className="text-sm text-muted mb-3">Arraste pelo ícone para mudar a ordem.</p>
        <SortableList items={ex} onReorder={(ids) => reorderExercises(s.id, ids)}>
          {(e, handle, i) => (
            <div className="card-flat p-2 flex items-center gap-2">
              {handle}
              <div className="min-w-0 flex-1"><b className="block text-sm truncate">{i + 1}. {e.name}</b><span className="text-xs text-muted">{e.status === 'done' ? 'Concluído' : e.status === 'skipped' ? 'Pulado' : `${e.target_sets} × ${e.target_reps}`}</span></div>
            </div>
          )}
        </SortableList>
      </Modal>

      <Modal open={finishAsk} onClose={() => setFinishAsk(false)} title="Finalizar treino?" footer={
        <div className="grid gap-2">
          <button className="btn btn-primary" onClick={finish}><Icon n="flag" />Finalizar e ver resumo</button>
          <button className="btn" onClick={() => setFinishAsk(false)}>Continuar treinando</button>
          <button className="btn btn-danger" onClick={async () => { if (await confirm({ title: 'Descartar este treino?', text: 'Nada será salvo no histórico.', ok: 'Descartar', danger: true })) { await discardSession(s.id); nav('/') } }}>Descartar treino</button>
        </div>}>
        <p className="text-[15px] leading-relaxed">{pendingSets > 0 ? `Ainda há ${pendingSets} série${pendingSets > 1 ? 's' : ''} sem marcar. Elas não serão contadas no resumo.` : 'Tudo certo! Vamos salvar este treino no seu histórico.'}</p>
      </Modal>
    </div>
  )
}

/* ---------------- resumo ---------------- */
function Summary({ s, fresh }: { s: Session; fresh: AchievementDef[] }) {
  const nav = useNavigate()
  const toast = useToast()
  const [sum, setSum] = useState<SessionSummary | null>(null)
  const [notes, setNotes] = useState(s.notes)
  const [comps, setComps] = useState<Record<string, Comparison>>({})
  useEffect(() => {
    let live = true
    void (async () => {
      const r = await summarize(s.id)
      if (!live || !r) return
      setSum(r)
      const out: Record<string, Comparison> = {}
      for (const e of r.exercises) {
        const done = e.sets.filter((x) => x.done)
        if (!done.length) continue
        const p = await lastPerformance(e.se.exercise_id, s.id)
        out[e.se.id] = compare(done.map((x) => ({ reps: x.reps ?? 0, load: x.load ?? 0 })), p?.sets)
      }
      if (live) setComps(out)
    })()
    return () => { live = false }
  }, [s.id])
  if (!sum) return <Spinner label="Montando resumo…" />
  const doneEx = sum.exercises.filter((e) => e.sets.some((x) => x.done))
  return (
    <div className="min-h-dvh bg-bg safe-t pb-28">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-4 page-in">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-accent text-onaccent mx-auto grid place-items-center shadow-lg"><Icon n="trophy" size={32} /></div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Treino concluído!</h1>
          <p className="text-muted text-sm mt-1">{s.name}</p>
        </div>
        {fresh.length > 0 && (
          <div className="card p-4 space-y-2 border-accent">
            {fresh.map((a) => <div key={a.key} className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-accent text-onaccent grid place-items-center"><Icon n={a.icon} /></div><div><b className="block leading-tight">Conquista desbloqueada: {a.title}</b><span className="text-sm text-muted">{a.desc}</span></div></div>)}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Duração', fmtDur(sum.durationSec), 'clock'],
            ['Exercícios', String(doneEx.length), 'dumbbell'],
            ['Séries', String(sum.setsDone), 'check'],
            ['Repetições', String(sum.repsTotal), 'repeat'],
          ].map(([l, v, i]) => (
            <div key={l} className="card-flat p-3.5"><Icon n={i} size={18} className="text-accentink" /><div className="text-2xl font-extrabold tnum mt-1">{v}</div><div className="text-xs text-muted font-semibold">{l}</div></div>
          ))}
        </div>
        <div className="card-flat p-3.5 flex justify-between text-sm"><span className="text-muted">Início <b className="text-fg">{fmtClock(s.started_at)}</b></span><span className="text-muted">Término <b className="text-fg">{fmtClock(s.ended_at ?? Date.now())}</b></span><span className="text-muted">Volume <b className="text-fg">{Math.round(sum.volume)} kg</b></span></div>

        <div className="space-y-3">
          {doneEx.map((e) => {
            const c = comps[e.se.id]
            return (
              <div key={e.se.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><b className="block">{e.se.name}</b>{e.se.replaced_from && <span className="text-xs text-muted">no lugar de {e.se.replaced_from}</span>}{!e.se.planned && <span className="text-xs text-muted"> · extra</span>}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">{e.sets.filter((x) => x.done).map((x, i) => <span key={x.id} className="chip tnum">S{i + 1}: {x.load ? `${kgFmt(x.load)} kg × ` : ''}{x.reps ?? 0}{e.se.unit === 'seg' ? ' s' : ''}</span>)}</div>
                {c && c.tone !== 'none' && <p className={`mt-2 text-sm font-bold ${c.tone === 'up' ? 'text-ok' : c.tone === 'down' ? 'text-miss' : c.tone === 'mixed' ? 'text-plan' : 'text-muted'}`}>{c.message}</p>}
              </div>
            )
          })}
          {!doneEx.length && <div className="card-flat p-5 text-center text-sm text-muted">Nenhuma série foi marcada neste treino.</div>}
        </div>

        <div>
          <label className="label" htmlFor="obs">Observações do treino</label>
          <textarea id="obs" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={async () => { await setSessionNotes(s.id, notes); toast('Observações salvas.') }} placeholder="Como foi? Dor, energia, ajustes para a próxima vez…" />
        </div>
        <button className="btn btn-primary w-full" onClick={async () => { await setSessionNotes(s.id, notes); nav('/') }}>Voltar ao início</button>
      </div>
    </div>
  )
}
