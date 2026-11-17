import { db, getMeta, setMeta } from './db'
import { uid } from './id'
import { DEFAULT_WORKOUTS } from '../data/defaultWorkouts'
import { LIB_EX } from './catalog'
import { addDays, weekStart } from './dates'
import { deleteWorkout, duplicateWorkout, workoutsOn } from './plan'
import type { PlannedItem, PlannedWorkout } from './types'

const SEED_FLAG = 'seed:default-workouts:v1'

/** UUID determinístico: o mesmo texto gera sempre o mesmo id (assim, vários aparelhos não duplicam os treinos padrão). */
export function detId(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x9e3779b9, h4 = 0x85ebca6b
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677)
    h3 = Math.imul(h3 ^ c, 2246822519); h4 = Math.imul(h4 ^ c, 3266489917)
  }
  const hex = [h1, h2, h3, h4].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

/** Sal único por aparelho/conta: ids determinísticos, mas nunca iguais entre pessoas diferentes (o banco usa o id como chave global). */
async function salt(): Promise<string> {
  let v = await getMeta<string>('seed:salt')
  if (!v) { v = uid(); await setMeta('seed:salt', v) }
  return v
}
export async function defaultTemplateId(key: string): Promise<string> {
  return detId(`${await salt()}:treino-padrao:${key}`)
}

/**
 * Cria os treinos padrão (segunda a sexta) como modelos, uma única vez por aparelho.
 * Os modelos nascem sem pendência de envio (ficam só no aparelho até serem editados) e com data antiga em updated_at.
 * Nunca recria um modelo que já existe localmente (nem o que a usuária excluiu).
 */
export async function seedDefaultWorkouts(): Promise<void> {
  if (await getMeta<boolean>(SEED_FLAG)) return
  const OLD = '2000-01-01T00:00:00.000Z'
  for (const w of DEFAULT_WORKOUTS) {
    const id = await defaultTemplateId(w.key)
    if (await db.planned_workouts.get(id)) continue
    const row: PlannedWorkout = {
      id, updated_at: OLD, _d: 0, date: null, name: w.name, kind: w.kind, location: w.location, cancelled: false, template: true, notes: w.notes, video_id: null,
    }
    const items: PlannedItem[] = w.items.map((it, i) => {
      const ex = LIB_EX.find((e) => e.id === it.ex)
      if (!ex) throw new Error(`Exercício inexistente na biblioteca: ${it.ex}`)
      return {
        id: detId(`${id}:${i}`), updated_at: OLD, _d: 0, workout_id: id, position: i, exercise_id: ex.id, name: ex.name, muscle_group: ex.group,
        sets: it.sets ?? ex.sets, reps: it.reps ?? ex.reps, unit: ex.unit, rest: it.rest ?? ex.rest, load: '', notes: it.note ?? '',
        group_id: it.group ? detId(`${id}:grupo`) : null, group_kind: it.group ? 'circuito' : null,
      }
    })
    await db.transaction('rw', db.planned_workouts, db.planned_items, async () => {
      await db.planned_workouts.put(row)
      await db.planned_items.bulkPut(items)
    })
  }
  await setMeta(SEED_FLAG, true)
}

/** Quantos dias de segunda a sexta da semana de `anchor` já têm treino planejado. */
export async function occupiedDefaultDays(anchor: string): Promise<number> {
  const start = weekStart(anchor)
  let n = 0
  for (const w of DEFAULT_WORKOUTS) if ((await workoutsOn(addDays(start, w.dow - 1))).some((x) => !x.cancelled)) n++
  return n
}

/**
 * Aplica os treinos padrão (segunda a sexta) na semana de `anchor`.
 * Com `replace`, os treinos já planejados desses dias são excluídos antes (treinos já realizados ficam intactos no histórico).
 */
export async function applyDefaultWeek(anchor: string, replace = false): Promise<number> {
  await seedDefaultWorkouts()
  const start = weekStart(anchor)
  let n = 0
  for (const w of DEFAULT_WORKOUTS) {
    const date = addDays(start, w.dow - 1)
    const existing = (await workoutsOn(date)).filter((x) => !x.cancelled)
    if (existing.length && !replace) continue
    const tpl = await db.planned_workouts.get(await defaultTemplateId(w.key))
    if (!tpl || tpl.deleted) continue
    for (const e of existing) await deleteWorkout(e.id)
    await duplicateWorkout(tpl.id, date)
    n++
  }
  return n
}
