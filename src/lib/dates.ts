export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const pad = (n: number) => String(n).padStart(2, '0')

export function dkey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function todayKey(): string {
  return dkey(new Date())
}
export function addDays(k: string, n: number): string {
  const d = parseKey(k)
  return dkey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
}
/** Segunda-feira da semana de k (semana segunda → domingo). */
export function weekStart(k: string): string {
  const d = parseKey(k)
  const off = (d.getDay() + 6) % 7
  return addDays(k, -off)
}
export function weekDays(k: string): string[] {
  const s = weekStart(k)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}
export function dow(k: string): number {
  return parseKey(k).getDay()
}
export function fmtDay(k: string): string {
  const d = parseKey(k)
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
}
export function fmtShort(k: string): string {
  const d = parseKey(k)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}
export function fmtWeek(k: string): string {
  const a = parseKey(weekStart(k))
  const b = parseKey(addDays(weekStart(k), 6))
  const m = (d: Date) => MESES[d.getMonth()].slice(0, 3)
  return `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`
}
export function fmtClock(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** mm:ss ou h:mm:ss */
export function fmtDur(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`
}
/** "1 h 05 min" / "42 min" */
export function fmtDurLong(totalSec: number): string {
  const m = Math.round(totalSec / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${pad(m % 60)} min`
}
export function monthGrid(year: number, month: number): (string | null)[] {
  // grade começando na segunda-feira
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) cells.push(dkey(new Date(year, month, d)))
  while (cells.length % 7) cells.push(null)
  return cells
}
