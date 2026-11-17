/** Planejamento semanal: operações sobre treinos planejados. Nunca mexem em sessões já realizadas. */
import { db, alive, put, putMany, softDelete, softDeleteRows } from './db'
import { uid } from './id'
import { addDays, todayKey, weekStart } from './dates'
import type { Ex } from './catalog'
import type { Location, PlannedItem, PlannedWorkout, Session } from './types'

export type DayStatus = 'planejado' | 'realizado' | 'nao-realizado' | 'cancelado'

export async function workoutsOn(date: string): Promise<PlannedWorkout[]> {
  return alive(await db.planned_workouts.where('date').equals(date).toArray()).filter((w) => !w.template)
}

export async function itemsOf(workoutId: string): Promise<PlannedItem[]> {
  return alive(await db.planned_items.where('workout_id').equals(workoutId).toArray()).sort((a, b) => a.position - b.position)
}

/** Status derivado: realizado = existe sessão finalizada vinculada (ou treino livre no mesmo dia sem plano). */
export function statusOf(w: PlannedWorkout, sessions: Session[], today = todayKey()): DayStatus {
  if (w.cancelled) return 'cancelado'
  if (sessions.some((s) => s.status === 'finished' && !s.deleted && s.planned_workout_id === w.id)) return 'realizado'
  if (w.date && w.date < today) return 'nao-realizado'
  return 'planejado'
}

export const STATUS_LABEL: Record<DayStatus, string> = {
  planejado: 'Planejado', realizado: 'Realizado', 'nao-realizado': 'Não realizado', cancelado: 'Cancelado',
}

export async function createWorkout(date: string | null, data: Partial<PlannedWorkout> = {}): Promise<PlannedWorkout> {
  return put(db.planned_workouts, {
    id: uid(), date, name: 'Treino', kind: '', location: 'academia' as Location, cancelled: false, template: false, notes: '', video_id: null, ...data,
  } as PlannedWorkout)
}

export function itemFromEx(ex: Ex, workoutId: string, position: number): Partial<PlannedItem> {
  return {
    id: uid(), workout_id: workoutId, position, exercise_id: ex.id, name: ex.name, muscle_group: ex.group,
    sets: ex.sets, reps: ex.reps, unit: ex.unit, rest: ex.rest, load: '', notes: '', group_id: null, group_kind: null,
  }
}

export async function addExercise(workoutId: string, ex: Ex) {
  const items = await itemsOf(workoutId)
  return put(db.planned_items, itemFromEx(ex, workoutId, items.length) as PlannedItem)
}

export async function updateItem(id: string, patch: Partial<PlannedItem>) {
  await put(db.planned_items, { id, ...patch })
}

export async function removeItem(id: string) {
  await softDelete(db.planned_items, id)
}

export async function reorderItems(workoutId: string, orderedIds: string[]) {
  const items = await itemsOf(workoutId)
  const map = new Map(items.map((i) => [i.id, i]))
  await putMany(db.planned_items, orderedIds.map((id, i) => ({ ...map.get(id)!, position: i })).filter((x) => x.id))
}

export async function replaceItem(id: string, ex: Ex) {
  const it = await db.planned_items.get(id)
  if (!it) return
  await put(db.planned_items, {
    exercise_id: ex.id, name: ex.name, muscle_group: ex.group, reps: ex.reps, unit: ex.unit, rest: ex.rest,
  }, it)
}

export async function duplicateItem(id: string) {
  const it = await db.planned_items.get(id)
  if (!it) return
  const items = await itemsOf(it.workout_id)
  const copy = { ...it, id: uid(), group_id: null, group_kind: null as null }
  const ids = items.map((i) => i.id)
  ids.splice(ids.indexOf(id) + 1, 0, copy.id)
  await put(db.planned_items, copy)
  await reorderItems(it.workout_id, ids)
}

export async function groupItems(ids: string[], kind: 'superserie' | 'circuito' | null) {
  const gid = kind ? uid() : null
  const rows = (await db.planned_items.bulkGet(ids)).filter((r): r is PlannedItem => !!r)
  await putMany(db.planned_items, rows.map((r) => ({ ...r, group_id: gid, group_kind: kind })))
}

/** Copia um treino (com exercícios) para outra data, ou para modelo quando date = null. */
export async function duplicateWorkout(id: string, toDate: string | null, asTemplate = false, nameSuffix = ''): Promise<PlannedWorkout | undefined> {
  const w = await db.planned_workouts.get(id)
  if (!w) return
  const items = await itemsOf(id)
  const nw = await put(db.planned_workouts, {
    ...w, id: uid(), date: toDate, template: asTemplate, cancelled: false, name: w.name + nameSuffix,
  } as PlannedWorkout)
  const gmap = new Map<string, string>()
  await putMany(db.planned_items, items.map((it) => {
    let g = it.group_id
    if (g) { if (!gmap.has(g)) gmap.set(g, uid()); g = gmap.get(g)! }
    return { ...it, id: uid(), workout_id: nw.id, group_id: g }
  }))
  return nw
}

export async function moveWorkout(id: string, toDate: string) {
  const w = await db.planned_workouts.get(id)
  if (w) await put(db.planned_workouts, { date: toDate }, w)
}

export async function cancelWorkout(id: string, cancelled = true) {
  const w = await db.planned_workouts.get(id)
  if (w) await put(db.planned_workouts, { cancelled }, w)
}

/** Exclui um treino planejado (e seus itens). As sessões já realizadas permanecem intactas. */
export async function deleteWorkout(id: string) {
  const items = await itemsOf(id)
  await softDeleteRows(db.planned_items, items)
  await softDelete(db.planned_workouts, id)
}

/** Copia todos os treinos de uma semana para outra (ignora dias que já tenham treino na semana de destino se `skipFilled`). */
export async function copyWeek(fromDate: string, toDate: string, skipFilled = true): Promise<number> {
  const from = weekStart(fromDate)
  const to = weekStart(toDate)
  let n = 0
  for (let i = 0; i < 7; i++) {
    const src = await workoutsOn(addDays(from, i))
    const dstDate = addDays(to, i)
    if (skipFilled && (await workoutsOn(dstDate)).length) continue
    for (const w of src) {
      if (w.cancelled) continue
      await duplicateWorkout(w.id, dstDate)
      n++
    }
  }
  return n
}

export async function listTemplates(): Promise<PlannedWorkout[]> {
  return (await db.planned_workouts.toArray()).filter((w) => w.template && !w.deleted)
}
