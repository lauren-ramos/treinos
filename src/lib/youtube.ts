import { LIBRARY } from '../data/library'
import { norm } from './catalog'
import { supabase } from './supabase'
import type { VideoExercise } from './types'

export function parseVideoId(url: string): string | null {
  const m = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{11})/)
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : null
}

/** Título do vídeo via oEmbed (não exige chave). Devolve '' se não conseguir. */
export async function fetchTitle(id: string): Promise<string> {
  const target = `https://www.youtube.com/watch?v=${id}`
  for (const u of [`https://noembed.com/embed?url=${encodeURIComponent(target)}`, `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`]) {
    try {
      const r = await fetch(u)
      if (!r.ok) continue
      const j = (await r.json()) as { title?: string }
      if (j.title) return j.title
    } catch { /* tenta o próximo */ }
  }
  return ''
}

export interface TranscriptResult { status: 'ok' | 'indisponivel'; text: string; reason?: string }

/**
 * A transcrição vem de uma Edge Function do Supabase (supabase/functions/youtube-transcript), porque o navegador
 * não consegue ler as legendas do YouTube diretamente (CORS). Sem ela, o usuário cola a transcrição manualmente.
 * Nada é inventado: se não houver transcrição, o resultado é "indisponível".
 */
export async function fetchTranscript(id: string): Promise<TranscriptResult> {
  if (!supabase) return { status: 'indisponivel', text: '', reason: 'Sem servidor configurado. Cole a transcrição manualmente.' }
  try {
    const { data, error } = await supabase.functions.invoke('youtube-transcript', { body: { id } })
    if (error) throw error
    const segs = (data?.segments ?? []) as { start: number; text: string }[]
    if (!segs.length) return { status: 'indisponivel', text: '', reason: data?.reason ?? 'Este vídeo não tem legendas acessíveis.' }
    return { status: 'ok', text: segs.map((s) => `[${fmt(s.start)}] ${s.text}`).join('\n') }
  } catch (e) {
    return { status: 'indisponivel', text: '', reason: `Não foi possível obter a transcrição (${String((e as Error)?.message ?? e)}).` }
  }
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/**
 * Formato de "copiar transcrição" do YouTube: o tempo vem grudado no rótulo de acessibilidade, ex.:
 *   "0:088 segundosTexto…"  /  "1:031 minuto e 3 segundosTexto…"  /  "2:002 minutosTexto…"
 * (M:SS + "N segundos" | "N minuto(s) [e N segundo(s)]" + texto, sem espaços).
 */
const PASTED = /^\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(\d+\s+(?:minutos?|segundos?)(?:\s+e\s+\d+\s+segundos?)?)\s*(.*)$/i

function parsePasted(line: string): { start: number; text: string } | null {
  const m = line.match(PASTED)
  if (!m) return null
  return { start: (m[1] ? parseInt(m[1], 10) * 3600 : 0) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10), text: m[5] }
}

/** Primeiro tempo da linha, em segundos: "[1:25]", "01:45", "[02:22](…?t=142s)", "t=105s" ou o formato colado do YouTube. */
function lineStart(line: string): number | null {
  const p = parsePasted(line)
  if (p) return p.start
  const m = line.match(/(?:^|[^\d])(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?!\d)/)
  if (m) return (m[1] ? parseInt(m[1], 10) * 3600 : 0) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10)
  const t = line.match(/[?&]t=(\d+)s?/)
  return t ? parseInt(t[1], 10) : null
}

/** Converte a transcrição colada do YouTube em linhas legíveis "[m:ss] texto" (editável pelo usuário). */
export function normalizeTranscript(raw: string): string {
  const out: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || /^\s*sincronizar com o momento do v[ií]deo\s*$/i.test(line)) continue
    const p = parsePasted(line)
    if (p) out.push(`[${fmt(p.start)}] ${p.text}`.trimEnd())
    else if (out.length && !/^\s*\[?\d{1,2}:\d{2}/.test(line)) out[out.length - 1] += ' ' + line.trim()
    else out.push(line.trim())
  }
  return out.join('\n')
}

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/** Remove marcação (links, listas, negrito) e tempos, deixando só o texto falado. */
function cleanLine(l: string): string {
  const p = parsePasted(l)
  const base = p ? p.text : l
  return norm(
    base.replace(/\[([^\]]*)\]\([^)]*\)/g, ' ') // [01:45](link) -> some
      .replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '')
      .replace(/^\s*\[?[\d:]+\]?\s*/, '')
      .replace(/\[(?:musica|music|aplausos)\]/gi, ' ')
      .replace(/[*_`#>]/g, ''),
  )
}

const NAMES = LIBRARY.map((ex) => ({ ex, names: [ex.name, ...ex.aliases].map(norm).sort((a, b) => b.length - a.length) }))

interface Hit { ex: (typeof LIBRARY)[number]; from: number; to: number }

/** Exercícios citados numa linha. Se o nome de um estiver contido no de outro ("agachamento sumo" ⊃ "agachamento"), vale o mais específico. */
function matchLine(text: string): Hit[] {
  const hits: Hit[] = []
  for (const { ex, names } of NAMES) {
    for (const n of names) {
      const m = new RegExp(`(^|[^a-z0-9])(${escapeRe(n)})(s|es)?(?=[^a-z0-9]|$)`).exec(text)
      if (m) { const from = m.index + m[1].length; hits.push({ ex, from, to: from + m[2].length }); break }
    }
  }
  // "agachamento" sozinho é genérico: se a linha cita outro exercício, ele não conta
  const specific = hits.length > 1 ? hits.filter((h) => h.ex.id !== 'agachamento-corporal') : hits
  return specific.filter((h) => !specific.some((o) => o !== h && o.from <= h.from && o.to >= h.to && (o.to - o.from) > (h.to - h.from)))
}

const WORDS: Record<string, string> = { uma: '1', duas: '2', dois: '2', tres: '3', quatro: '4', cinco: '5', seis: '6' }

function findDose(ctx: string): { sets: number | null; reps: string } | null {
  const t = ctx.replace(/\b(uma|duas|dois|tres|quatro|cinco|seis)\b(?=\s+series?)/g, (w) => WORDS[w])
  const a = t.match(/(\d{1,2})\s*series?\s*(?:de|com)?\s*(\d{1,3})/)
  if (a) return { sets: +a[1], reps: a[2] }
  const b = t.match(/(\d{1,2})\s*x\s*(\d{1,3})/)
  if (b) return { sets: +b[1], reps: b[2] }
  const r = t.match(/(\d{1,3})\s*(?:a|-|ate)\s*(\d{1,3})\s*(?:repeticoes|repeticao|reps|vezes)/)
  if (r) return { sets: null, reps: `${r[1]}-${r[2]}` }
  const c = t.match(/(\d{1,3})\s*(?:repeticoes|repeticao|reps|vezes)/)
  if (c) return { sets: null, reps: c[1] }
  return null
}

/**
 * Identifica exercícios da biblioteca mencionados na transcrição (por nome ou apelido), na ordem em que aparecem.
 * Procura séries/repetições na própria linha e, se não houver, nas seguintes (até outro exercício ser citado).
 * Só reconhece o que realmente aparece no texto: não inventa nada.
 */
export function extractExercises(transcript: string): VideoExercise[] {
  const lines = transcript.split(/\r?\n/).filter((l) => l.trim())
  let last: number | null = null
  const flat = lines.map((raw) => {
    const s = lineStart(raw)
    if (s !== null) last = s
    const text = cleanLine(raw)
    return { text, start: s ?? last, hits: matchLine(text) }
  })
  const seen = new Set<string>()
  const out: VideoExercise[] = []
  const hitIdx = flat.map((l, i) => (l.hits.length ? i : -1)).filter((i) => i >= 0)
  for (const [i, l] of flat.entries()) {
    for (const h of l.hits) {
      if (seen.has(h.ex.id)) continue
      seen.add(h.ex.id)
      let ctx = l.text
      let dose = findDose(ctx)
      for (let j = i + 1; !dose && j <= i + 4 && j < flat.length && !flat[j].hits.length; j++) {
        ctx += ' ' + flat[j].text
        dose = findDose(ctx)
      }
      // séries citadas como "primeira série", "segunda série"… dentro do trecho deste exercício
      const next = hitIdx.find((k) => k > i) ?? flat.length
      const seg = flat.slice(i, Math.min(next, i + 40)).map((x) => x.text).join(' ')
      const ord = [...seg.matchAll(/(primeira|segunda|terceira|quarta|quinta)\s+series?/g)].map((m) => ({ primeira: 1, segunda: 2, terceira: 3, quarta: 4, quinta: 5 })[m[1] as 'primeira'])
      const spoken = dose?.sets ?? (ord.length ? Math.max(...ord) : null)
      const reps = dose?.reps || ''
      // todo exercício importado vem com séries: o que o vídeo disse; senão a sugestão da biblioteca (avisada na observação)
      const fallbackSets = spoken === null
      const fallbackReps = !reps
      out.push({
        name: h.ex.name, exercise_id: h.ex.id, start: l.start, sets: spoken ?? h.ex.sets, reps: reps || h.ex.reps, selected: true,
        note: fallbackSets || fallbackReps ? `${fallbackSets ? 'séries' : ''}${fallbackSets && fallbackReps ? ' e repetições' : fallbackReps ? 'repetições' : ''} sugeridas pela biblioteca (não ditas no vídeo)` : '',
      })
    }
  }
  return out
}
