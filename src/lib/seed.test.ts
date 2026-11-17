import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, wipeAll } from './db'
import { DEFAULT_WORKOUTS } from '../data/defaultWorkouts'
import { LIB_BY_ID } from '../data/library'
import { applyDefaultWeek, occupiedDefaultDays, seedDefaultWorkouts } from './seed'
import { itemsOf, listTemplates, workoutsOn } from './plan'

beforeEach(async () => { await wipeAll() })

describe('treinos padrão (segunda a sexta)', () => {
  it('todos os exercícios existem na biblioteca e têm séries e repetições', () => {
    for (const w of DEFAULT_WORKOUTS) for (const it of w.items) {
      expect(LIB_BY_ID[it.ex], `${w.key}: ${it.ex}`).toBeTruthy()
      expect(it.sets ?? 1).toBeGreaterThan(0)
    }
  })

  it('cria 5 modelos uma única vez, sem pendência de envio', async () => {
    await seedDefaultWorkouts()
    await seedDefaultWorkouts()
    const t = await listTemplates()
    expect(t).toHaveLength(5)
    expect((await itemsOf(t[0].id)).length).toBeGreaterThan(5)
    expect(await db.planned_workouts.where('_d').equals(1).count()).toBe(0)
  })

  it('aplica seg–sex na semana sem sobrescrever dias que já têm treino', async () => {
    const n = await applyDefaultWeek('2026-11-17') // semana de 16 a 22/11
    expect(n).toBe(5)
    expect((await workoutsOn('2026-11-16'))[0].name).toContain('Segunda')
    expect((await workoutsOn('2026-11-20'))[0].name).toContain('Sexta')
    expect(await workoutsOn('2026-11-21')).toHaveLength(0)
    expect(await applyDefaultWeek('2026-11-17')).toBe(0)
    expect(await occupiedDefaultDays('2026-11-17')).toBe(5)
    const ter = (await workoutsOn('2026-11-17'))[0]
    const items = await itemsOf(ter.id)
    expect(items.filter((i) => i.group_id).length).toBe(3) // combinação de ombros
    expect(items.every((i) => i.sets > 0 && i.reps)).toBe(true)
  })

  it('com substituição, troca os treinos planejados dos dias ocupados e não duplica', async () => {
    await applyDefaultWeek('2026-11-17')
    const antes = (await workoutsOn('2026-11-17'))[0].id
    expect(await applyDefaultWeek('2026-11-17', true)).toBe(5)
    const ter = await workoutsOn('2026-11-17')
    expect(ter).toHaveLength(1)
    expect(ter[0].id).not.toBe(antes)
    expect(ter[0].name).toContain('Terça')
    expect((await itemsOf(ter[0].id)).length).toBeGreaterThan(5)
  })
})
