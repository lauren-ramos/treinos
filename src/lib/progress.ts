import { db, alive } from './db'
import type { Session, SessionSet } from './types'

export interface PerfSet { reps: number; load: number }

export interface Perf {
  session_id: string
  date: string
  ended_at: number
  sets: PerfSet[]
}

export const volume = (sets: PerfSet[]) => sets.reduce((a, s) => a + (s.load || 0) * s.reps, 0)
export const totalReps = (sets: PerfSet[]) => sets.reduce((a, s) => a + s.reps, 0)
export const maxLoad = (sets: PerfSet[]) => sets.reduce((a, s) => Math.max(a, s.load || 0), 0)
/** 1RM estimado (Epley) da melhor série. */
export const e1rm = (sets: PerfSet[]) => sets.reduce((a, s) => Math.max(a, s.load > 0 ? s.load * (1 + s.reps / 30) : 0), 0)

function toPerfSets(rows: SessionSet[]): PerfSet[] {
  return rows
    .filter((s) => s.done && !s.deleted && (s.reps ?? 0) > 0)
    .sort((a, b) => a.set_index - b.set_index)
    .map((s) => ({ reps: s.reps ?? 0, load: s.load ?? 0 }))
}

/** Histórico de um exercício: um item por treino finalizado, do mais antigo ao mais recente. */
export async function exerciseHistory(exerciseId: string, excludeSessionId?: string): Promise<Perf[]> {
  const sets = alive(await db.session_sets.where('exercise_id').equals(exerciseId).toArray()).filter((s) => s.done)
  const ids = [...new Set(sets.map((s) => s.session_id))].filter((id) => id !== excludeSessionId)
  const sessions = (await db.sessions.bulkGet(ids)).filter((x): x is Session => !!x && x.status === 'finished' && !x.deleted)
  const out: Perf[] = []
  for (const se of sessions) {
    const ps = toPerfSets(sets.filter((s) => s.session_id === se.id))
    if (ps.length) out.push({ session_id: se.id, date: se.date, ended_at: se.ended_at ?? se.started_at, sets: ps })
  }
  return out.sort((a, b) => a.ended_at - b.ended_at)
}

/** Última execução finalizada (antes do treino atual). */
export async function lastPerformance(exerciseId: string, excludeSessionId?: string): Promise<Perf | null> {
  const h = await exerciseHistory(exerciseId, excludeSessionId)
  return h.length ? h[h.length - 1] : null
}

export type Verdict = 'carga' | 'reps' | 'igual' | 'menor' | 'misto' | 'sem-base'
export interface Comparison {
  verdict: Verdict
  tone: 'up' | 'same' | 'down' | 'mixed' | 'none'
  message: string
  loadDiff: number
  repsDiff: number
  volDiff: number
}

const kg = (n: number) => `${Math.abs(Math.round(n * 10) / 10).toString().replace('.', ',')} kg`

/**
 * Compara o desempenho atual com o anterior. Carga maior NÃO significa automaticamente melhora:
 * considera também repetições, número de séries e volume total (carga × repetições).
 */
export function compare(cur: PerfSet[], prev: PerfSet[] | null | undefined): Comparison {
  if (!prev || !prev.length) return { verdict: 'sem-base', tone: 'none', message: 'Primeira vez com este exercício: seus números de hoje viram a referência.', loadDiff: 0, repsDiff: 0, volDiff: 0 }
  if (!cur.length) return { verdict: 'sem-base', tone: 'none', message: 'Marque suas séries para comparar com o último treino.', loadDiff: 0, repsDiff: 0, volDiff: 0 }
  const loadDiff = Math.round((maxLoad(cur) - maxLoad(prev)) * 100) / 100
  const repsDiff = totalReps(cur) - totalReps(prev)
  const volDiff = Math.round(volume(cur) - volume(prev))
  const bodyweight = maxLoad(cur) === 0 && maxLoad(prev) === 0
  const base = { loadDiff, repsDiff, volDiff }
  if (bodyweight) {
    if (repsDiff > 0) return { ...base, verdict: 'reps', tone: 'up', message: `Você conseguiu fazer ${repsDiff} repetição${repsDiff > 1 ? 'ões' : ''} a mais!` }
    if (repsDiff < 0) return { ...base, verdict: 'menor', tone: 'down', message: `${Math.abs(repsDiff)} repetição${Math.abs(repsDiff) > 1 ? 'ões' : ''} a menos que na última vez. Faz parte: respeite seu dia.` }
    return { ...base, verdict: 'igual', tone: 'same', message: 'Seu desempenho foi mantido.' }
  }
  if (loadDiff > 0) {
    if (volDiff >= 0) return { ...base, verdict: 'carga', tone: 'up', message: `Você aumentou ${kg(loadDiff)} em relação ao último treino!` }
    return { ...base, verdict: 'misto', tone: 'mixed', message: `Carga ${kg(loadDiff)} maior, mas com menos volume total (menos repetições/séries). Veja se vale consolidar antes de subir.` }
  }
  if (loadDiff < 0) {
    if (volDiff > 0) return { ...base, verdict: 'misto', tone: 'mixed', message: `Carga ${kg(loadDiff)} menor, porém com mais volume total. O desempenho geral até subiu.` }
    return { ...base, verdict: 'menor', tone: 'down', message: `Carga ${kg(loadDiff)} menor que na última vez. Tudo bem variar conforme o dia.` }
  }
  if (repsDiff > 0) return { ...base, verdict: 'reps', tone: 'up', message: `Você conseguiu fazer ${repsDiff} repetição${repsDiff > 1 ? 'ões' : ''} a mais!` }
  if (repsDiff < 0) return { ...base, verdict: 'menor', tone: 'down', message: `${Math.abs(repsDiff)} repetição${Math.abs(repsDiff) > 1 ? 'ões' : ''} a menos com a mesma carga.` }
  return { ...base, verdict: 'igual', tone: 'same', message: 'Seu desempenho foi mantido.' }
}

/** Compara uma série individual com a série de mesmo índice da última execução. */
export function compareSet(cur: PerfSet | undefined, prev: PerfSet | undefined): 'up' | 'down' | 'same' | 'none' {
  if (!cur || !prev) return 'none'
  const a = (cur.load || 0) * cur.reps
  const b = (prev.load || 0) * prev.reps
  if ((cur.load || 0) > (prev.load || 0) && a >= b) return 'up'
  if ((cur.load || 0) === (prev.load || 0) && cur.reps > prev.reps) return 'up'
  if ((cur.load || 0) < (prev.load || 0) && a <= b) return 'down'
  if ((cur.load || 0) === (prev.load || 0) && cur.reps < prev.reps) return 'down'
  return 'same'
}
