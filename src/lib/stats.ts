import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive, put } from './db'
import { addDays, dkey, parseKey, todayKey, weekDays, weekStart, dow } from './dates'
import { statusOf } from './plan'
import { e1rm, type PerfSet } from './progress'
import { uid } from './id'
import type { Achievement, Goal, PlannedItem, PlannedWorkout, Session, SessionSet } from './types'

export interface AppData {
  sessions: Session[] // finalizadas
  active: Session | undefined
  sets: SessionSet[] // apenas feitas
  workouts: PlannedWorkout[] // planejados (não modelos)
  goals: Goal[]
  achievements: Achievement[]
  ready: boolean
}

/** Carrega tudo (volume pequeno, local) de forma reativa. */
export function useAppData(): AppData {
  const r = useLiveQuery(async () => {
    const allSessions = alive(await db.sessions.toArray())
    return {
      sessions: allSessions.filter((s) => s.status === 'finished').sort((a, b) => a.started_at - b.started_at),
      active: allSessions.filter((s) => s.status === 'active' || s.status === 'paused').sort((a, b) => b.started_at - a.started_at)[0],
      sets: alive(await db.session_sets.toArray()).filter((s) => s.done),
      workouts: alive(await db.planned_workouts.toArray()).filter((w) => !w.template),
      goals: alive(await db.goals.toArray()),
      achievements: alive(await db.achievements.toArray()),
      ready: true,
    } as AppData
  }, [], undefined)
  return r ?? { sessions: [], active: undefined, sets: [], workouts: [], goals: [], achievements: [], ready: false }
}

export const durSec = (s: Session) => Math.max(0, Math.round(((s.ended_at ?? s.started_at) - s.started_at - s.paused_total_ms) / 1000))

export type DayState = 'done' | 'planned' | 'missed' | 'none'

export function dayState(date: string, d: AppData, today = todayKey()): DayState {
  if (d.sessions.some((s) => s.date === date)) return 'done'
  const ws = d.workouts.filter((w) => w.date === date && !w.cancelled)
  if (!ws.length) return 'none'
  return date < today ? 'missed' : 'planned'
}

export function sessionsOn(date: string, d: AppData) {
  return d.sessions.filter((s) => s.date === date)
}

export function weekCount(date: string, d: AppData): number {
  const days = new Set(weekDays(date))
  return new Set(d.sessions.filter((s) => days.has(s.date)).map((s) => s.date)).size
}

export function plannedInWeek(date: string, d: AppData): number {
  const days = new Set(weekDays(date))
  return d.workouts.filter((w) => w.date && days.has(w.date) && !w.cancelled).length
}

/**
 * Sequência de dias treinados: conta para trás a partir de hoje. Dias livres (sem treino planejado)
 * não quebram a sequência; um treino planejado e não realizado, sim.
 */
export function streak(d: AppData, today = todayKey()): number {
  const trained = new Set(d.sessions.map((s) => s.date))
  const planned = new Set(d.workouts.filter((w) => w.date && !w.cancelled).map((w) => w.date as string))
  let n = 0
  let freeRun = 0
  let k = today
  for (let i = 0; i < 400; i++) {
    if (trained.has(k)) { n++; freeRun = 0 }
    else if (k < today && planned.has(k)) break // treino planejado que não foi feito quebra a sequência
    else if (k < today && ++freeRun >= 8) break // muito tempo parado
    k = addDays(k, -1)
  }
  return n
}

export function bestStreak(d: AppData): number {
  const days = [...new Set(d.sessions.map((s) => s.date))].sort()
  const planned = new Set(d.workouts.filter((w) => w.date && !w.cancelled).map((w) => w.date as string))
  let best = 0
  let cur = 0
  let prev: string | null = null
  for (const day of days) {
    if (prev) {
      let broken = false
      for (let k = addDays(prev, 1); k < day; k = addDays(k, 1)) if (planned.has(k)) { broken = true; break }
      cur = broken ? 1 : cur + 1
    } else cur = 1
    best = Math.max(best, cur)
    prev = day
  }
  return best
}

export function monthSummary(year: number, month: number, d: AppData) {
  const inMonth = d.sessions.filter((s) => {
    const x = parseKey(s.date)
    return x.getFullYear() === year && x.getMonth() === month
  })
  const totalSec = inMonth.reduce((a, s) => a + durSec(s), 0)
  const days = new Set(inMonth.map((s) => s.date))
  const weeks = new Map<string, number>()
  for (const day of days) weeks.set(weekStart(day), (weeks.get(weekStart(day)) ?? 0) + 1)
  const dowCount = [0, 0, 0, 0, 0, 0, 0]
  for (const day of days) dowCount[dow(day)]++
  const maxDow = Math.max(...dowCount)
  const lastDay = new Date(year, month + 1, 0)
  const weeksInMonth = (lastDay.getDate() / 7)
  return {
    count: inMonth.length,
    hours: totalSec / 3600,
    totalSec,
    avgPerWeek: weeksInMonth ? Math.round((days.size / weeksInMonth) * 10) / 10 : 0,
    topDays: maxDow > 0 ? dowCount.map((c, i) => ({ c, i })).filter((x) => x.c === maxDow).map((x) => x.i) : [],
    dowCount,
  }
}

/* ---------------- metas ---------------- */
export interface GoalProgress { goal: Goal; current: number; target: number; pct: number; achieved: boolean; label: string }

export function goalProgress(g: Goal, d: AppData, today = todayKey()): GoalProgress {
  let current = 0
  let label = ''
  let target = g.target
  switch (g.kind) {
    case 'weekly_sessions':
      current = weekCount(today, d)
      label = `Treinar ${g.target}x por semana`
      break
    case 'monthly_sessions': {
      const t = parseKey(today)
      current = monthSummary(t.getFullYear(), t.getMonth(), d).count
      label = `Completar ${g.target} treinos no mês`
      break
    }
    case 'streak':
      current = streak(d, today)
      label = `Sequência de ${g.target} dias treinados`
      break
    case 'exercise_load': {
      const mx = d.sets.filter((s) => s.exercise_id === g.exercise_id).reduce((a, s) => Math.max(a, s.load ?? 0), 0)
      current = mx
      label = `${g.exercise_name || 'Exercício'}: chegar a ${g.target} kg`
      break
    }
    case 'week_complete': {
      const planned = plannedInWeek(today, d)
      current = d.workouts.filter((w) => w.date && !w.cancelled && weekDays(today).includes(w.date) && d.sessions.some((s) => s.planned_workout_id === w.id)).length
      target = planned || 1
      label = 'Completar todos os treinos planejados da semana'
      break
    }
  }
  const pct = target > 0 ? Math.min(1, current / target) : 0
  return { goal: g, current, target, pct, achieved: current >= target && target > 0, label }
}

/* ---------------- conquistas ---------------- */
export interface AchievementDef { key: string; title: string; desc: string; icon: string; test: (d: AppData) => boolean }

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first', title: 'Primeiro treino', desc: 'Finalizou seu primeiro treino.', icon: 'flag', test: (d) => d.sessions.length >= 1 },
  { key: 'five', title: '5 treinos', desc: 'Cinco treinos concluídos.', icon: 'star', test: (d) => d.sessions.length >= 5 },
  { key: 'ten', title: '10 treinos', desc: 'Dez treinos concluídos.', icon: 'star', test: (d) => d.sessions.length >= 10 },
  { key: 'twentyfive', title: '25 treinos', desc: 'Vinte e cinco treinos concluídos.', icon: 'medal', test: (d) => d.sessions.length >= 25 },
  { key: 'fifty', title: '50 treinos', desc: 'Cinquenta treinos concluídos.', icon: 'trophy', test: (d) => d.sessions.length >= 50 },
  { key: 'week3', title: 'Semana forte', desc: 'Treinou 3 vezes na mesma semana.', icon: 'flame', test: (d) => d.sessions.length > 0 && Math.max(...d.sessions.map((s) => weekCount(s.date, d))) >= 3 },
  { key: 'streak7', title: '7 dias de sequência', desc: 'Sete dias treinados seguidos de plano.', icon: 'flame', test: (d) => bestStreak(d) >= 7 },
  { key: 'sets100', title: '100 séries', desc: 'Cem séries concluídas no total.', icon: 'check', test: (d) => d.sets.length >= 100 },
  { key: 'hours10', title: '10 horas treinadas', desc: 'Somou dez horas de treino.', icon: 'clock', test: (d) => d.sessions.reduce((a, s) => a + durSec(s), 0) >= 36000 },
  {
    key: 'weekdone', title: 'Semana completa', desc: 'Cumpriu todos os treinos planejados de uma semana.', icon: 'trophy',
    test: (d) => {
      const weeks = new Set(d.workouts.filter((w) => w.date && !w.cancelled).map((w) => weekStart(w.date as string)))
      for (const wk of weeks) {
        const ws = d.workouts.filter((w) => w.date && !w.cancelled && weekStart(w.date) === wk)
        if (ws.length >= 2 && ws.every((w) => d.sessions.some((s) => s.planned_workout_id === w.id))) return true
      }
      return false
    },
  },
]

/** Desbloqueia conquistas novas e devolve as que acabaram de ser conquistadas. */
export async function checkAchievements(): Promise<AchievementDef[]> {
  const sessions = alive(await db.sessions.toArray()).filter((s) => s.status === 'finished')
  const data: AppData = {
    sessions: sessions.sort((a, b) => a.started_at - b.started_at), active: undefined,
    sets: alive(await db.session_sets.toArray()).filter((s) => s.done),
    workouts: alive(await db.planned_workouts.toArray()).filter((w) => !w.template),
    goals: [], achievements: [], ready: true,
  }
  const have = new Set(alive(await db.achievements.toArray()).map((a) => a.key))
  const fresh: AchievementDef[] = []
  for (const a of ACHIEVEMENTS) {
    if (!have.has(a.key) && a.test(data)) {
      await put(db.achievements, { id: uid(), key: a.key, unlocked_at: new Date().toISOString() } as Achievement)
      fresh.push(a)
    }
  }
  // metas atingidas
  const goals = alive(await db.goals.toArray())
  for (const g of goals) {
    if (g.active && !g.achieved_at) {
      const p = goalProgress(g, { ...data, goals })
      if (p.achieved) await put(db.goals, { ...g, active: false, achieved_at: new Date().toISOString() } as Goal)
    }
  }
  return fresh
}

export function itemsForWeek(date: string, d: AppData, items: PlannedItem[]) {
  const ids = new Set(d.workouts.filter((w) => w.date && weekDays(date).includes(w.date)).map((w) => w.id))
  return items.filter((i) => ids.has(i.workout_id))
}

export { e1rm, dkey }
export type { PerfSet }
