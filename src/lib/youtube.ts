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

/** Primeiro tempo da linha, em segundos: "[1:25]", "01:45", "[02:22](…?t=142s)" ou "t=105s". */
function lineStart(line: string): number | null {
  const m = line.match(/(?:^|[^\d])(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?!\d)/)
  if (m) return (m[1] ? parseInt(m[1], 10) * 3600 : 0) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10)
  const t = line.match(/[?&]t=(\d+)s?/)
  return t ? parseInt(t[1], 10) : null
}

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/** Remove marcação (links, listas, negrito) e tempos, deixando só o texto falado. */
function cleanLine(l: string): string {
  return norm(
    l.replace(/\[([^\]]*)\]\([^)]*\)/g, ' ') // [01:45](link) -> some
      .replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '')
      .replace(/^\s*\[?[\d:]+\]?\s*/, '')
      .replace(/[*_`#>]/g, ''),
  )
}

const NAMES = LIBRARY.map((ex) => ({ ex, names: [ex.name, ...ex.aliases].map(norm).sort((a, b) => b.length - a.length) }))

/** Exercícios citados numa linha. Quando um nome contém outro (ex.: "agachamento sumô" e "agachamento"), vale o mais específico. */
function matchLine(text: string): { ex: (typeof LIBRARY)[number]; len: number }[] {
  const out: { ex: (typeof LIBRARY)[number]; len: number }[] = []
  for (const { ex, names } of NAMES) {
    for (const n of names) {
      if (new RegExp(`(^|[^a-z0-9])${escapeRe(n)}(s|es)?([^a-z0-9]|$)`).test(text)) { out.push({ ex, len: n.length }); break }
    }
  }
  const max = Math.max(0, ...out.map((o) => o.len))
  return out.filter((o) => o.len === max)
}

/**
 * Identifica exercícios da biblioteca mencionados na transcrição (por nome ou apelido), na ordem em que aparecem.
 * Procura séries/repetições citadas na própria linha (ou na seguinte, se ela não citar outro exercício).
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
  for (const [i, l] of flat.entries()) {
    for (const h of l.hits) {
      if (seen.has(h.ex.id)) continue
      seen.add(h.ex.id)
      let ctx = l.text
      const nx = flat[i + 1]
      if (nx && !nx.hits.length && !/\d/.test(l.text)) ctx += ' ' + nx.text
      let sets: number | null = null
      let reps = ''
      const a = ctx.match(/(\d{1,2})\s*(?:series|serie)\s*(?:de|com)?\s*(\d{1,3})/)
      const b = ctx.match(/(\d{1,2})\s*x\s*(\d{1,3})/)
      const c = ctx.match(/(\d{1,3})\s*(?:repeticoes|repeticao|reps|vezes)/)
      if (a) { sets = +a[1]; reps = a[2] } else if (b) { sets = +b[1]; reps = b[2] } else if (c) reps = c[1]
      out.push({ name: h.ex.name, exercise_id: h.ex.id, start: l.start, sets, reps, note: '', selected: true })
    }
  }
  return out
}
