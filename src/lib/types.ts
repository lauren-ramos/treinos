export type Location = 'academia' | 'casa'
export type Difficulty = 'iniciante' | 'intermediario' | 'avancado'

/** Campos comuns a toda linha sincronizável. */
export interface Row {
  id: string
  updated_at: string // ISO; usado para resolver conflitos (o mais recente vence)
  deleted?: boolean // exclusão lógica (para propagar a exclusão na sincronização)
  _d?: 0 | 1 // 1 = alteração local ainda não enviada (nunca vai para o servidor)
}

export interface Profile extends Row {
  name: string
  photo: string // data URL (redimensionada)
  goal_text: string
  preferred_location: Location | 'ambos'
  available_days: number[] // 0=domingo … 6=sábado
  theme: 'light' | 'dark' | 'system'
  default_rest: number // segundos
  auto_rest: boolean
  sound: boolean
  vibrate: boolean
  notifications: boolean
  keep_awake: boolean
  onboarded: boolean
}

export interface CustomExercise extends Row {
  name: string
  muscle_group: string
  secondary: string[]
  description: string
  equipment: string[]
  sets: number
  reps: string
  unit: 'reps' | 'seg'
  rest: number
  load: string
  difficulty: Difficulty
  location: Location[]
  notes: string
  steps: string[]
  demo: string // chave de uma demonstração da biblioteca escolhida pelo usuário ('' = nenhuma)
}

export interface PlannedWorkout extends Row {
  date: string | null // YYYY-MM-DD; null = modelo salvo
  name: string
  kind: string // tipo de treino (ex.: "Pernas e glúteos")
  location: Location
  cancelled: boolean
  template: boolean
  notes: string
  video_id: string | null
}

export interface PlannedItem extends Row {
  workout_id: string
  position: number
  exercise_id: string
  name: string
  muscle_group: string
  sets: number
  reps: string
  unit: 'reps' | 'seg'
  rest: number
  load: string
  notes: string
  group_id: string | null // superséries / agrupamentos
  group_kind: 'superserie' | 'circuito' | null
}

export type SessionStatus = 'active' | 'paused' | 'finished' | 'discarded'

export interface Session extends Row {
  planned_workout_id: string | null
  date: string
  name: string
  kind: string
  location: Location
  status: SessionStatus
  started_at: number // epoch ms
  ended_at: number | null
  paused_at: number | null
  paused_total_ms: number
  rest_end_at: number | null // epoch ms de término do descanso (rodando)
  rest_left_ms: number | null // restante do descanso (quando pausado)
  rest_total_s: number
  rest_label: string
  current_index: number
  notes: string
}

export type SExStatus = 'pending' | 'skipped' | 'removed' | 'done'

export interface SessionExercise extends Row {
  session_id: string
  position: number
  exercise_id: string
  name: string
  muscle_group: string
  target_sets: number
  target_reps: string
  unit: 'reps' | 'seg'
  target_load: string
  rest: number
  status: SExStatus
  group_id: string | null
  group_kind: 'superserie' | 'circuito' | null
  replaced_from: string // nome do exercício substituído (histórico preservado)
  planned: boolean // false = extra adicionado durante o treino
  notes: string
}

export interface SessionSet extends Row {
  session_id: string
  session_exercise_id: string
  exercise_id: string
  exercise_name: string
  date: string
  set_index: number
  reps: number | null
  load: number | null
  done: boolean
  done_at: number | null
}

export type GoalKind = 'weekly_sessions' | 'monthly_sessions' | 'streak' | 'exercise_load' | 'week_complete'

export interface Goal extends Row {
  kind: GoalKind
  target: number
  exercise_id: string
  exercise_name: string
  active: boolean
  created_on: string
  achieved_at: string | null
}

export interface Achievement extends Row {
  key: string
  unlocked_at: string
}

export interface VideoExercise {
  name: string
  exercise_id: string | null
  start: number | null // segundo no vídeo
  sets: number | null
  reps: string
  note: string
  selected: boolean
}

export interface Video extends Row {
  url: string
  youtube_id: string
  title: string
  transcript: string
  transcript_status: 'ok' | 'indisponivel' | 'manual'
  exercises: VideoExercise[]
  notes: string
}
