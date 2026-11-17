import { useLiveQuery } from 'dexie-react-hooks'
import { db, alive } from './db'
import { LIBRARY, type LibExercise } from '../data/library'
import type { CustomExercise, Difficulty, Location } from './types'

/** Exercício unificado (biblioteca embutida + personalizados do usuário). */
export interface Ex {
  id: string
  name: string
  group: string
  secondary: string[]
  description: string
  equipment: string[]
  sets: number
  reps: string
  unit: 'reps' | 'seg'
  rest: number
  difficulty: Difficulty
  location: Location[]
  loadable: boolean
  custom: boolean
  demo: string // '' = sem animação
  notes: string
  lib?: LibExercise
  customSteps?: string[]
}

export function fromLib(e: LibExercise): Ex {
  return {
    id: e.id, name: e.name, group: e.group, secondary: e.secondary, description: e.description, equipment: e.equipment,
    sets: e.sets, reps: e.reps, unit: e.unit, rest: e.rest, difficulty: e.difficulty, location: e.location, loadable: e.loadable,
    custom: false, demo: e.demo, notes: '', lib: e,
  }
}

export function fromCustom(c: CustomExercise): Ex {
  return {
    id: c.id, name: c.name, group: c.muscle_group, secondary: c.secondary ?? [], description: c.description, equipment: c.equipment ?? [],
    sets: c.sets, reps: c.reps, unit: c.unit ?? 'reps', rest: c.rest, difficulty: c.difficulty, location: c.location ?? ['academia', 'casa'], loadable: true,
    custom: true, demo: c.demo ?? '', notes: c.notes, customSteps: c.steps,
  }
}

export const LIB_EX: Ex[] = LIBRARY.map(fromLib)

export function useCustomExercises(): CustomExercise[] {
  return useLiveQuery(async () => alive(await db.custom_exercises.toArray()), [], []) ?? []
}

export function useCatalog(): Ex[] {
  const custom = useCustomExercises()
  return [...LIB_EX, ...custom.map(fromCustom)]
}

export function findIn(catalog: Ex[], id: string): Ex | undefined {
  return catalog.find((e) => e.id === id)
}

/** Primeiro número de um texto como "8-12" ou "12 por perna" (usado como meta de repetições). */
export function parseTarget(reps: string): number | null {
  const m = String(reps ?? '').match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

export function parseLoad(s: string): number | null {
  const m = String(s ?? '').replace(',', '.').match(/\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
