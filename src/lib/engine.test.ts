import 'fake-indexeddb/auto'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { db, wipeAll, pendingCount } from './db'
import { createWorkout, addExercise, updateItem, deleteWorkout, itemsOf, copyWeek, statusOf, duplicateWorkout, workoutsOn } from './plan'
import {
  startSession, getActiveSession, toggleSet, updateSet, getSessionSets, getSessionExercises, pauseSession, resumeSession, elapsedMs,
  restLeftMs, finishSession, replaceExercise, summarize, addExerciseToSession, discardSession, adjustRest, addSet,
} from './session'
import { LIB_EX } from './catalog'
import { compare, exerciseHistory, lastPerformance } from './progress'

const adv = (ms: number) => vi.setSystemTime(Date.now() + ms)
const ex = (id: string) => LIB_EX.find((e) => e.id === id)!

async function plan() {
  const w = await createWorkout('2026-11-17', { name: 'Pernas', kind: 'Pernas e glúteos', location: 'academia' })
  await addExercise(w.id, ex('agachamento-livre'))
  await addExercise(w.id, ex('leg-press'))
  return w
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T10:00:00'))
  await wipeAll()
})
afterEach(() => vi.useRealTimers())

describe('treino em andamento', () => {
  it('1+2+8: salva progresso e retoma exatamente de onde parou (reabrir/atualizar a página)', async () => {
    const w = await plan()
    const s = await startSession({ plannedWorkoutId: w.id })
    let sets = await getSessionSets(s.id)
    expect(sets).toHaveLength(8) // 4 + 4 (séries padrão da biblioteca)
    await updateSet(sets[0].id, { reps: 8, load: 40 })
    await toggleSet(sets[0].id)
    adv(30_000)

    // "fechar o app": nada fica em memória; reabrir = ler do IndexedDB
    const again = await getActiveSession()
    expect(again?.id).toBe(s.id)
    sets = await getSessionSets(s.id)
    expect(sets[0]).toMatchObject({ done: true, reps: 8, load: 40 })
    expect((await getSessionExercises(s.id))[0].status).toBe('pending')
    expect(again!.rest_end_at).not.toBeNull() // descanso automático começou
  })

  it('não inicia outro treino enquanto existir um em andamento', async () => {
    const w = await plan()
    await startSession({ plannedWorkoutId: w.id })
    await expect(startSession({ plannedWorkoutId: w.id })).rejects.toThrow('active-exists')
  })

  it('3: cronômetro respeita pausas (inclusive com o app fechado)', async () => {
    const w = await plan()
    const s = await startSession({ plannedWorkoutId: w.id })
    adv(10 * 60_000)
    await pauseSession(s.id)
    adv(30 * 60_000) // app fechado durante a pausa
    let cur = (await getActiveSession())!
    expect(cur.status).toBe('paused')
    expect(Math.round(elapsedMs(cur) / 60_000)).toBe(10)
    await resumeSession(s.id)
    adv(5 * 60_000)
    cur = (await getActiveSession())!
    expect(Math.round(elapsedMs(cur) / 60_000)).toBe(15)
  })

  it('descanso: conta pelo relógio real, congela na pausa e permite ajustar', async () => {
    const w = await plan()
    const s = await startSession({ plannedWorkoutId: w.id })
    const sets = await getSessionSets(s.id)
    await toggleSet(sets.find((x) => x.exercise_id === 'agachamento-livre')!.id) // descanso de 120 s do agachamento
    let cur = (await getActiveSession())!
    expect(Math.round(restLeftMs(cur) / 1000)).toBe(120)
    adv(50_000)
    cur = (await getActiveSession())!
    expect(Math.round(restLeftMs(cur) / 1000)).toBe(70)
    await pauseSession(s.id)
    adv(60_000)
    cur = (await getActiveSession())!
    expect(Math.round(restLeftMs(cur) / 1000)).toBe(70) // congelado
    await resumeSession(s.id)
    await adjustRest(s.id, 15)
    cur = (await getActiveSession())!
    expect(Math.round(restLeftMs(cur) / 1000)).toBe(85)
    adv(90_000)
    expect(restLeftMs((await getActiveSession())!)).toBe(0)
  })

  it('avança para o próximo exercício quando todas as séries terminam', async () => {
    const w = await plan()
    const s = await startSession({ plannedWorkoutId: w.id })
    const sets = await getSessionSets(s.id)
    const first = sets.filter((x) => x.exercise_id === 'agachamento-livre')
    for (const x of first) await toggleSet(x.id)
    const exs = await getSessionExercises(s.id)
    expect(exs[0].status).toBe('done')
    expect((await getActiveSession())!.current_index).toBe(1)
  })

  it('substituir exercício mantém o original no histórico', async () => {
    const w = await plan()
    const s = await startSession({ plannedWorkoutId: w.id })
    const sets = await getSessionSets(s.id)
    await toggleSet(sets[0].id) // 1 série feita do agachamento
    const [first] = await getSessionExercises(s.id)
    await replaceExercise(first.id, ex('agachamento-goblet'))
    const vis = await getSessionExercises(s.id)
    expect(vis[0]).toMatchObject({ exercise_id: 'agachamento-goblet', replaced_from: 'Agachamento livre com barra' })
    const sum = await summarize(s.id)
    expect(sum!.exercises.some((e) => e.se.exercise_id === 'agachamento-livre' && e.sets.some((x) => x.done))).toBe(true)
  })

  it('adicionar exercício extra e série extra durante o treino', async () => {
    const w = await plan()
    const s = await startSession({ plannedWorkoutId: w.id })
    const se = await addExerciseToSession(s.id, ex('prancha'))
    expect((await getSessionExercises(s.id)).length).toBe(3)
    await addSet(se!.id)
    const sets = (await getSessionSets(s.id)).filter((x) => x.session_exercise_id === se!.id)
    expect(sets).toHaveLength(4)
    expect(se!.planned).toBe(false)
  })
})

describe('planejamento x histórico', () => {
  it('4: alterar/excluir o planejamento não modifica treinos realizados', async () => {
    const w = await plan()
    const s = await startSession({ plannedWorkoutId: w.id })
    const sets = await getSessionSets(s.id)
    await updateSet(sets[0].id, { reps: 10, load: 50 })
    await toggleSet(sets[0].id)
    await finishSession(s.id)
    const before = JSON.stringify(await summarize(s.id))

    const items = await itemsOf(w.id)
    await updateItem(items[0].id, { sets: 9, reps: '99', name: 'Outro nome' })
    await deleteWorkout(w.id)

    expect(JSON.stringify(await summarize(s.id))).toBe(before)
    const done = (await getSessionSets(s.id)).filter((x) => x.done)
    expect(done).toHaveLength(1)
    expect(done[0]).toMatchObject({ reps: 10, load: 50, exercise_name: 'Agachamento livre com barra' })
  })

  it('status: planejado → realizado / não realizado', async () => {
    const w = await plan()
    expect(statusOf(w, [], '2026-11-17')).toBe('planejado')
    expect(statusOf(w, [], '2026-11-18')).toBe('nao-realizado')
    const s = await startSession({ plannedWorkoutId: w.id })
    const fin = await finishSession(s.id)
    expect(statusOf(w, [fin!], '2026-11-18')).toBe('realizado')
  })

  it('copiar semana e duplicar treino não alteram a origem', async () => {
    const w = await plan()
    const n = await copyWeek('2026-11-17', '2026-11-24')
    expect(n).toBe(1)
    const copied = await workoutsOn('2026-11-24')
    expect(copied).toHaveLength(1)
    expect((await itemsOf(copied[0].id)).map((i) => i.exercise_id)).toEqual(['agachamento-livre', 'leg-press'])
    const d = await duplicateWorkout(w.id, '2026-11-20')
    expect(d!.id).not.toBe(w.id)
    expect(await itemsOf(w.id)).toHaveLength(2)
  })
})

describe('histórico inteligente', () => {
  async function doSession(load: number, reps: number, nSets = 3) {
    const w = await createWorkout('2026-11-17', { name: 'Peito' })
    await addExercise(w.id, { ...ex('supino-halteres'), sets: nSets })
    const s = await startSession({ plannedWorkoutId: w.id })
    for (const set of await getSessionSets(s.id)) {
      await updateSet(set.id, { reps, load })
      await toggleSet(set.id)
    }
    await finishSession(s.id)
    adv(24 * 3600_000)
    return s.id
  }

  it('5: lembra a última execução e compara', async () => {
    await doSession(8, 12)
    await doSession(10, 10)
    const last = await lastPerformance('supino-halteres')
    expect(last!.sets.map((x) => x.load)).toEqual([10, 10, 10])
    const hist = await exerciseHistory('supino-halteres')
    expect(hist).toHaveLength(2)
    // próxima sessão: pré-preenche a carga da última vez
    const w = await createWorkout('2026-11-19')
    await addExercise(w.id, ex('supino-halteres'))
    await discardActiveIfAny()
    const s = await startSession({ plannedWorkoutId: w.id })
    expect((await getSessionSets(s.id))[0].load).toBe(10)
  })

  it('carga maior com menos volume NÃO é tratada como melhora', () => {
    const prev = [{ reps: 12, load: 8 }, { reps: 12, load: 8 }, { reps: 12, load: 8 }]
    expect(compare([{ reps: 10, load: 10 }], prev).verdict).toBe('misto')
    expect(compare([{ reps: 12, load: 10 }, { reps: 12, load: 10 }, { reps: 12, load: 10 }], prev)).toMatchObject({ verdict: 'carga', tone: 'up' })
    expect(compare(prev, prev).verdict).toBe('igual')
    expect(compare([{ reps: 14, load: 8 }, { reps: 12, load: 8 }, { reps: 12, load: 8 }], prev)).toMatchObject({ verdict: 'reps', repsDiff: 2 })
    expect(compare([{ reps: 10, load: 6 }, { reps: 10, load: 6 }], prev).verdict).toBe('menor')
    expect(compare([{ reps: 10, load: 8 }], null).verdict).toBe('sem-base')
  })
})

async function discardActiveIfAny() {
  const a = await getActiveSession()
  if (a) await discardSession(a.id)
}

/* ------------------------------------------------------------------ sincronização */
type Row = Record<string, unknown> & { id: string; updated_at: string }
const server: Record<string, Map<string, Row>> = {}
let online = true
let upsertCalls = 0
const tick = { n: 0 }

vi.mock('./supabase', () => {
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'user-1' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (t: string) => ({
      upsert: async (rows: Row[]) => {
        if (!online) return { error: new TypeError('Failed to fetch') }
        upsertCalls++
        const tbl = (server[t] ??= new Map())
        for (const r of rows) {
          const old = tbl.get(r.id)
          if (old && r.updated_at < old.updated_at) continue // guarda do servidor
          tbl.set(r.id, { ...r, synced_at: new Date(Date.UTC(2026, 0, 1) + ++tick.n * 1000).toISOString() })
        }
        return { error: null }
      },
      select: () => {
        let cursor = ''
        const b = {
          gt: (_c: string, v: string) => { cursor = v; return b },
          order: () => b,
          limit: () => b,
          then: (res: (v: unknown) => void) => {
            if (!online) return res({ data: null, error: new TypeError('Failed to fetch') })
            const rows = [...(server[t] ?? new Map()).values()].filter((r) => String(r.synced_at) > cursor).sort((a, c) => String(a.synced_at).localeCompare(String(c.synced_at)))
            res({ data: rows, error: null })
          },
        }
        return b
      },
    }),
  }
  return { supabase: client, supaConfigured: true }
})

describe('modo offline e sincronização', () => {
  it('6+7: treino completo offline → sincroniza ao reconectar, sem duplicar', async () => {
    const { syncNow, getSyncState } = await import('./sync')
    for (const k of Object.keys(server)) delete server[k]
    online = false
    const w = await plan()
    const s = await startSession({ plannedWorkoutId: w.id })
    const sets = await getSessionSets(s.id)
    for (const x of sets.slice(0, 3)) { await updateSet(x.id, { reps: 10, load: 60 }); await toggleSet(x.id) }
    await finishSession(s.id, 'ótimo treino')
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
    await syncNow()
    expect(getSyncState().status).toBe('offline')
    expect(await pendingCount()).toBeGreaterThan(0) // dados preservados no aparelho

    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
    online = true
    await syncNow()
    expect(getSyncState().status).toBe('online')
    expect(await pendingCount()).toBe(0)
    expect(server.sessions.size).toBe(1)
    expect(server.session_sets.size).toBe(8)
    expect([...server.session_sets.values()].filter((r) => r.done).length).toBe(3)
    expect(server.sessions.get(s.id)).toMatchObject({ status: 'finished', user_id: 'user-1', notes: 'ótimo treino' })

    // reenviar não duplica
    await db.sessions.update(s.id, { _d: 1 })
    await syncNow()
    expect(server.sessions.size).toBe(1)
    expect(upsertCalls).toBeGreaterThan(0)
  })

  it('não sobrescreve registro mais novo do servidor e baixa mudanças de outro aparelho', async () => {
    const { syncNow } = await import('./sync')
    online = true
    const w = await plan()
    await syncNow()
    const remote = server.planned_workouts.get(w.id)!
    server.planned_workouts.set(w.id, { ...remote, name: 'Editado em outro aparelho', updated_at: new Date(Date.now() + 60_000).toISOString(), synced_at: '2099-01-01T00:00:00Z' })
    await syncNow()
    expect((await db.planned_workouts.get(w.id))!.name).toBe('Editado em outro aparelho')
  })
})
