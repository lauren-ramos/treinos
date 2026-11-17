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

/** Converte "[m:ss]" ou "m:ss" ao início da linha em segundos. */
function lineStart(line: string): number | null {
  const m = line.match(/^\s*\[?(?:(\d+):)?(\d{1,2}):(\d{2})\]?/)
  if (!m) return null
  return (m[1] ? parseInt(m[1], 10) * 3600 : 0) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10)
}

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/**
 * Identifica exercícios da biblioteca mencionados na transcrição (por nome ou apelido), na ordem em que aparecem.
 * Procura séries/repetições citadas perto da menção. Só reconhece o que realmente aparece no texto.
 */
export function extractExercises(transcript: string): VideoExercise[] {
  const lines = transcript.split(/\r?\n/).filter((l) => l.trim())
  const hits: { idx: number; ex: (typeof LIBRARY)[number]; start: number | null; ctx: string }[] = []
  let lastStart: number | null = null
  const flat: { text: string; start: number | null }[] = lines.map((l) => {
    const s = lineStart(l)
    if (s !== null) lastStart = s
    return { text: norm(l.replace(/^\s*\[?[\d:]+\]?\s*/, '')), start: s ?? lastStart }
  })
  const seen = new Set<string>()
  for (const [i, l] of flat.entries()) {
    for (const ex of LIBRARY) {
      if (seen.has(ex.id)) continue
      const names = [ex.name, ...ex.aliases].map(norm).sort((a, b) => b.length - a.length)
      const found = names.find((n) => new RegExp(`(^|[^a-z0-9])${escapeRe(n)}(s|es)?([^a-z0-9]|$)`).test(l.text))
      if (found) {
        seen.add(ex.id)
        hits.push({ idx: i, ex, start: l.start, ctx: flat.slice(i, i + 3).map((x) => x.text).join(' ') })
      }
    }
  }
  return hits
    .sort((a, b) => a.idx - b.idx)
    .map((h) => {
      let sets: number | null = null
      let reps = ''
      const a = h.ctx.match(/(\d{1,2})\s*(?:series|serie)\s*(?:de|com)?\s*(\d{1,3})/)
      const b = h.ctx.match(/(\d{1,2})\s*x\s*(\d{1,3})/)
      const c = h.ctx.match(/(\d{1,3})\s*(?:repeticoes|repeticao|reps|vezes)/)
      if (a) { sets = +a[1]; reps = a[2] } else if (b) { sets = +b[1]; reps = b[2] } else if (c) reps = c[1]
      return { name: h.ex.name, exercise_id: h.ex.id, start: h.start, sets, reps, note: '', selected: true }
    })
}
