/**
 * Motor do treino em execução. Tudo é gravado no IndexedDB a cada alteração, e o tempo é sempre
 * calculado a partir de carimbos de data/hora (não de contadores em memória). Por isso o cronômetro
 * e o descanso sobrevivem a recarregar a página, fechar o app ou bloquear o celular.
 */
import { db, alive, put, putMany, softDelete, getProfile } from './db'
import { uid } from './id'
import { todayKey } from './dates'
import { lastPerformance } from './progress'
import { parseLoad, parseTarget, type Ex } from './catalog'
import type { PlannedItem, Session, SessionExercise, SessionSet, Location } from './types'

/* ---------------- tempo ---------------- */
export const elapsedMs = (s: Session, now = Date.now()): number => {
  const end = s.status === 'finished' ? (s.ended_at ?? now) : (s.paused_at ?? now)
  return Math.max(0, end - s.started_at - s.paused_total_ms)
}
export const isPaused = (s: Session) => s.paused_at !== null
export const restLeftMs = (s: Session, now = Date.now()): number => {
  if (s.paused_at !== null) return s.rest_left_ms ?? 0
  return s.rest_end_at ? Math.max(0, s.rest_end_at - now) : 0
}
export const restRunning = (s: Session) => s.rest_end_at !== null || (s.paused_at !== null && (s.rest_left_ms ?? 0) > 0)

/* ---------------- leitura ---------------- */
export async function getActiveSession(): Promise<Session | undefined> {
  const rows = alive(await db.sessions.where('status').anyOf('active', 'paused').toArray())
  return rows.sort((a, b) => b.started_at - a.started_at)[0]
}

export async function getSessionExercises(sessionId: string, includeRemoved = false): Promise<SessionExercise[]> {
  const rows = alive(await db.session_exercises.where('session_id').equals(sessionId).toArray())
  return rows.filter((r) => includeRemoved || r.status !== 'removed').sort((a, b) => a.position - b.position)
}

export async function getSessionSets(sessionId: string): Promise<SessionSet[]> {
  const pos = new Map((await db.session_exercises.where('session_id').equals(sessionId).toArray()).map((e) => [e.id, e.position]))
  return alive(await db.session_sets.where('session_id').equals(sessionId).toArray()).sort(
    (a, b) => (pos.get(a.session_exercise_id) ?? 0) - (pos.get(b.session_exercise_id) ?? 0) || a.set_index - b.set_index,
  )
}

/* ---------------- criação ---------------- */
async function buildSets(session: Session, se: SessionExercise, ex: { loadHint: string }, count: number, startIndex = 0): Promise<SessionSet[]> {
  const prev = await lastPerformance(se.exercise_id, session.id)
  const targetReps = parseTarget(se.target_reps)
  const hintLoad = parseLoad(ex.loadHint)
  const rows: Partial<SessionSet>[] = []
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i
    const p = prev?.sets[idx] ?? prev?.sets[prev.sets.length - 1]
    rows.push({
      id: uid(), session_id: session.id, session_exercise_id: se.id, exercise_id: se.exercise_id, exercise_name: se.name,
      date: session.date, set_index: idx, reps: targetReps, load: p ? p.load || null : hintLoad, done: false, done_at: null,
    })
  }
  return putMany(db.session_sets, rows)
}

export interface StartOptions {
  plannedWorkoutId?: string | null
  name?: string
  kind?: string
  location?: Location
}

export async function startSession(opts: StartOptions = {}): Promise<Session> {
  const existing = await getActiveSession()
  if (existing) throw new Error('active-exists')
  const now = Date.now()
  let name = opts.name ?? 'Treino livre'
  let kind = opts.kind ?? ''
  let location: Location = opts.location ?? 'academia'
  let items: PlannedItem[] = []
  if (opts.plannedWorkoutId) {
    const w = await db.planned_workouts.get(opts.plannedWorkoutId)
    if (w) {
      name = w.name
      kind = w.kind
      location = w.location
      items = alive(await db.planned_items.where('workout_id').equals(w.id).toArray()).sort((a, b) => a.position - b.position)
    }
  }
  const session = await put(db.sessions, {
    id: uid(), planned_workout_id: opts.plannedWorkoutId ?? null, date: todayKey(), name, kind, location, status: 'active',
    started_at: now, ended_at: null, paused_at: null, paused_total_ms: 0, rest_end_at: null, rest_left_ms: null, rest_total_s: 0,
    rest_label: '', current_index: 0, notes: '',
  } as Session)
  for (const [i, it] of items.entries()) {
    const se = await put(db.session_exercises, {
      id: uid(), session_id: session.id, position: i, exercise_id: it.exercise_id, name: it.name, muscle_group: it.muscle_group,
      target_sets: it.sets, target_reps: it.reps, unit: it.unit ?? 'reps', target_load: it.load, rest: it.rest, status: 'pending',
      group_id: it.group_id, group_kind: it.group_kind, replaced_from: '', planned: true, notes: it.notes,
    } as SessionExercise)
    await buildSets(session, se, { loadHint: it.load }, it.sets)
  }
  return session
}

/* ---------------- pausa e descanso ---------------- */
export async function pauseSession(id: string) {
  const s = await db.sessions.get(id)
  if (!s || s.paused_at !== null || s.status !== 'active') return
  const now = Date.now()
  await put(db.sessions, {
    status: 'paused', paused_at: now,
    rest_left_ms: s.rest_end_at ? Math.max(0, s.rest_end_at - now) : null, rest_end_at: null,
  }, s)
}

export async function resumeSession(id: string) {
  const s = await db.sessions.get(id)
  if (!s || s.paused_at === null) return
  const now = Date.now()
  const left = s.rest_left_ms ?? 0
  await put(db.sessions, {
    status: 'active', paused_at: null, paused_total_ms: s.paused_total_ms + (now - s.paused_at),
    rest_end_at: left > 0 ? now + left : null, rest_left_ms: null,
  }, s)
}

export async function startRest(id: string, seconds: number, label = '') {
  const s = await db.sessions.get(id)
  if (!s || seconds <= 0) return
  await put(db.sessions, { rest_end_at: Date.now() + seconds * 1000, rest_left_ms: null, rest_total_s: seconds, rest_label: label }, s)
}

export async function adjustRest(id: string, deltaSec: number) {
  const s = await db.sessions.get(id)
  if (!s || !restRunning(s)) return
  if (s.paused_at !== null) {
    await put(db.sessions, { rest_left_ms: Math.max(1000, (s.rest_left_ms ?? 0) + deltaSec * 1000), rest_total_s: Math.max(5, s.rest_total_s + deltaSec) }, s)
  } else {
    await put(db.sessions, { rest_end_at: Math.max(Date.now() + 1000, (s.rest_end_at ?? Date.now()) + deltaSec * 1000), rest_total_s: Math.max(5, s.rest_total_s + deltaSec) }, s)
  }
}

export async function endRest(id: string) {
  const s = await db.sessions.get(id)
  if (!s || (s.rest_end_at === null && s.rest_left_ms === null)) return
  await put(db.sessions, { rest_end_at: null, rest_left_ms: null }, s)
}

/* ---------------- séries ---------------- */
function nextPending(list: SessionExercise[], from: number): number {
  for (let i = 1; i <= list.length; i++) {
    const k = (from + i) % list.length
    if (list[k].status === 'pending') return k
  }
  return -1
}

export async function toggleSet(setId: string): Promise<{ restStarted: boolean }> {
  const set = await db.session_sets.get(setId)
  if (!set) return { restStarted: false }
  const s = await db.sessions.get(set.session_id)
  if (!s || s.status === 'finished') return { restStarted: false }
  const done = !set.done
  await put(db.session_sets, { done, done_at: done ? Date.now() : null }, set)
  const list = await getSessionExercises(s.id)
  const idx = list.findIndex((e) => e.id === set.session_exercise_id)
  if (idx < 0) return { restStarted: false }
  const ex = list[idx]
  const sets = (await getSessionSets(s.id)).filter((x) => x.session_exercise_id === ex.id)
  const allDone = sets.length > 0 && sets.every((x) => x.done)
  if (!done) {
    if (ex.status === 'done') await put(db.session_exercises, { status: 'pending' }, ex)
    return { restStarted: false }
  }
  if (allDone && ex.status !== 'done') {
    await put(db.session_exercises, { status: 'done' }, ex)
    list[idx] = { ...ex, status: 'done' }
  }
  // supersérie / circuito: alterna entre os exercícios do grupo; descansa só ao fechar a rodada
  let restSeconds = ex.rest
  let next = idx
  let startRestNow = true
  if (ex.group_id) {
    const members = list.map((e, i) => ({ e, i })).filter((m) => m.e.group_id === ex.group_id)
    const pos = members.findIndex((m) => m.i === idx)
    const after = members.slice(pos + 1).find((m) => m.e.status === 'pending')
    if (after) {
      next = after.i
      startRestNow = false
    } else {
      const first = members.find((m) => m.e.status === 'pending')
      next = first ? first.i : nextPending(list, idx)
      restSeconds = Math.max(...members.map((m) => m.e.rest))
    }
  } else if (list[idx].status === 'done') {
    next = nextPending(list, idx)
  }
  const prof = await getProfile()
  const patch: Partial<Session> = {}
  if (next >= 0 && next !== s.current_index) patch.current_index = next
  const finished = list.every((e) => e.status !== 'pending')
  let restStarted = false
  if (startRestNow && prof.auto_rest && !finished) {
    const secs = restSeconds > 0 ? restSeconds : prof.default_rest
    patch.rest_total_s = secs
    patch.rest_label = ex.name
    if (s.paused_at === null) patch.rest_end_at = Date.now() + secs * 1000
    else patch.rest_left_ms = secs * 1000
    restStarted = true
  }
  if (Object.keys(patch).length) await put(db.sessions, patch, s)
  return { restStarted }
}

export async function updateSet(setId: string, patch: { reps?: number | null; load?: number | null }) {
  await put(db.session_sets, { id: setId, ...patch })
}

export async function addSet(sessionExerciseId: string) {
  const se = await db.session_exercises.get(sessionExerciseId)
  if (!se) return
  const s = await db.sessions.get(se.session_id)
  if (!s) return
  const sets = (await getSessionSets(s.id)).filter((x) => x.session_exercise_id === se.id)
  const last = sets[sets.length - 1]
  await put(db.session_sets, {
    id: uid(), session_id: s.id, session_exercise_id: se.id, exercise_id: se.exercise_id, exercise_name: se.name, date: s.date,
    set_index: sets.length, reps: last?.reps ?? parseTarget(se.target_reps), load: last?.load ?? null, done: false, done_at: null,
  } as SessionSet)
  if (se.status === 'done') await put(db.session_exercises, { status: 'pending' }, se)
}

export async function removeSet(setId: string) {
  const set = await db.session_sets.get(setId)
  if (!set) return
  await softDelete(db.session_sets, setId)
  const rest = (await getSessionSets(set.session_id)).filter((x) => x.session_exercise_id === set.session_exercise_id && x.id !== setId)
  // reindexa
  await putMany(db.session_sets, rest.map((r, i) => ({ ...r, set_index: i })))
}

/* ---------------- exercícios durante o treino ---------------- */
export async function setCurrent(sessionId: string, index: number) {
  const s = await db.sessions.get(sessionId)
  if (s) await put(db.sessions, { current_index: index }, s)
}

export async function skipExercise(seId: string) {
  const se = await db.session_exercises.get(seId)
  if (!se) return
  await put(db.session_exercises, { status: 'skipped' }, se)
  const s = await db.sessions.get(se.session_id)
  if (!s) return
  const list = await getSessionExercises(s.id)
  const idx = list.findIndex((e) => e.id === seId)
  const n = nextPending(list.map((e) => (e.id === seId ? { ...e, status: 'skipped' as const } : e)), idx)
  if (n >= 0) await put(db.sessions, { current_index: n }, s)
}

export async function unskipExercise(seId: string) {
  const se = await db.session_exercises.get(seId)
  if (se) await put(db.session_exercises, { status: 'pending' }, se)
}

export async function removeExercise(seId: string) {
  const se = await db.session_exercises.get(seId)
  if (!se) return
  await put(db.session_exercises, { status: 'removed' }, se)
  const s = await db.sessions.get(se.session_id)
  if (!s) return
  const list = await getSessionExercises(s.id)
  if (s.current_index >= list.length) await put(db.sessions, { current_index: Math.max(0, list.length - 1) }, s)
}

export async function addExerciseToSession(sessionId: string, ex: Ex, opts: { afterIndex?: number } = {}) {
  const s = await db.sessions.get(sessionId)
  if (!s) return
  const list = await getSessionExercises(sessionId, true)
  const pos = list.length ? Math.max(...list.map((l) => l.position)) + 1 : 0
  const se = await put(db.session_exercises, {
    id: uid(), session_id: sessionId, position: pos, exercise_id: ex.id, name: ex.name, muscle_group: ex.group,
    target_sets: ex.sets, target_reps: ex.reps, unit: ex.unit, target_load: '', rest: ex.rest, status: 'pending',
    group_id: null, group_kind: null, replaced_from: '', planned: false, notes: '',
  } as SessionExercise)
  await buildSets(s, se, { loadHint: '' }, ex.sets)
  if (opts.afterIndex !== undefined) {
    const vis = await getSessionExercises(sessionId)
    const ids = vis.map((v) => v.id).filter((id) => id !== se.id)
    ids.splice(opts.afterIndex + 1, 0, se.id)
    await reorderExercises(sessionId, ids)
  }
  return se
}

/** Substitui um exercício mantendo o original no histórico (as séries já feitas continuam registradas). */
export async function replaceExercise(seId: string, ex: Ex) {
  const old = await db.session_exercises.get(seId)
  if (!old) return
  const s = await db.sessions.get(old.session_id)
  if (!s) return
  await put(db.session_exercises, { status: 'removed' }, old)
  const se = await put(db.session_exercises, {
    id: uid(), session_id: s.id, position: old.position, exercise_id: ex.id, name: ex.name, muscle_group: ex.group,
    target_sets: old.target_sets, target_reps: ex.reps, unit: ex.unit, target_load: '', rest: ex.rest, status: 'pending',
    group_id: old.group_id, group_kind: old.group_kind, replaced_from: old.replaced_from || old.name, planned: old.planned, notes: '',
  } as SessionExercise)
  await buildSets(s, se, { loadHint: '' }, old.target_sets)
  // séries ainda não feitas do antigo ficam sem uso: remove-as para não contar como pendentes
  const oldSets = (await getSessionSets(s.id)).filter((x) => x.session_exercise_id === old.id && !x.done)
  for (const x of oldSets) await softDelete(db.session_sets, x.id)
}

export async function duplicateExercise(seId: string) {
  const se = await db.session_exercises.get(seId)
  if (!se) return
  const s = await db.sessions.get(se.session_id)
  if (!s) return
  const list = await getSessionExercises(s.id, true)
  const copy = await put(db.session_exercises, {
    ...se, id: uid(), position: Math.max(...list.map((l) => l.position)) + 1, status: 'pending', group_id: null, group_kind: null, planned: false,
  } as SessionExercise)
  await buildSets(s, copy, { loadHint: se.target_load }, se.target_sets)
  const vis = await getSessionExercises(s.id)
  const ids = vis.map((v) => v.id).filter((id) => id !== copy.id)
  const at = ids.indexOf(se.id)
  ids.splice(at + 1, 0, copy.id)
  await reorderExercises(s.id, ids)
}

export async function reorderExercises(sessionId: string, orderedIds: string[]) {
  const all = await getSessionExercises(sessionId, true)
  const removed = all.filter((a) => !orderedIds.includes(a.id))
  const map = new Map(all.map((a) => [a.id, a]))
  const rows = [...orderedIds.map((id) => map.get(id)!).filter(Boolean), ...removed].map((r, i) => ({ ...r, position: i }))
  await putMany(db.session_exercises, rows)
}

export async function groupExercises(seIds: string[], kind: 'superserie' | 'circuito' | null) {
  const gid = kind ? uid() : null
  const rows = (await db.session_exercises.bulkGet(seIds)).filter((r): r is SessionExercise => !!r)
  await putMany(db.session_exercises, rows.map((r) => ({ ...r, group_id: gid, group_kind: kind })))
}

export async function updateExerciseMeta(seId: string, patch: Partial<Pick<SessionExercise, 'rest' | 'target_reps' | 'notes'>>) {
  await put(db.session_exercises, { id: seId, ...patch })
}

export async function setSessionNotes(id: string, notes: string) {
  const s = await db.sessions.get(id)
  if (s) await put(db.sessions, { notes }, s)
}

/* ---------------- finalização ---------------- */
export async function finishSession(id: string, notes?: string): Promise<Session | undefined> {
  const s = await db.sessions.get(id)
  if (!s) return
  const now = Date.now()
  const paused = s.paused_at !== null ? now - s.paused_at : 0
  return put(db.sessions, {
    status: 'finished', ended_at: now, paused_at: null, paused_total_ms: s.paused_total_ms + paused,
    rest_end_at: null, rest_left_ms: null, ...(notes !== undefined ? { notes } : {}),
  }, s)
}

export async function discardSession(id: string) {
  const s = await db.sessions.get(id)
  if (!s) return
  await put(db.sessions, { status: 'discarded', rest_end_at: null, rest_left_ms: null, paused_at: null }, s)
}

export interface SessionSummary {
  session: Session
  durationSec: number
  exercises: { se: SessionExercise; sets: SessionSet[] }[]
  setsDone: number
  repsTotal: number
  volume: number
  allDone: boolean
}

export async function summarize(id: string): Promise<SessionSummary | null> {
  const session = await db.sessions.get(id)
  if (!session) return null
  const ses = await getSessionExercises(id, true)
  const sets = await getSessionSets(id)
  const exercises = ses
    .map((se) => ({ se, sets: sets.filter((x) => x.session_exercise_id === se.id) }))
    .filter((e) => e.se.status !== 'removed' || e.sets.some((x) => x.done))
  const doneSets = sets.filter((x) => x.done)
  return {
    session,
    durationSec: Math.round(elapsedMs(session) / 1000),
    exercises,
    setsDone: doneSets.length,
    repsTotal: doneSets.reduce((a, x) => a + (x.reps ?? 0), 0),
    volume: doneSets.reduce((a, x) => a + (x.reps ?? 0) * (x.load ?? 0), 0),
    allDone: ses.filter((e) => e.status !== 'removed').every((e) => e.status === 'done' || e.status === 'skipped'),
  }
}
