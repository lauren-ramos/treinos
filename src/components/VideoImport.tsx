import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Field, Icon, Modal, Spinner, useToast } from './ui'
import { db, alive, put } from '../lib/db'
import { extractExercises, fetchTitle, fetchTranscript, parseVideoId } from '../lib/youtube'
import { findIn, useCatalog, type Ex } from '../lib/catalog'
import { uid } from '../lib/id'
import type { Video, VideoExercise } from '../lib/types'

/**
 * Importa um vídeo do YouTube: título, transcrição (editável), exercícios identificados (editáveis) e observações.
 * Nada é inventado: sem transcrição, o usuário cola o texto ou adiciona exercícios manualmente.
 */
export function VideoImport({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (items: { ex: Ex; sets: number | null; reps: string; note: string }[], video: Video) => void }) {
  const toast = useToast()
  const catalog = useCatalog()
  const saved = useLiveQuery(async () => alive(await db.videos.toArray()).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)), [], [])
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [v, setV] = useState<Video | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { if (open) { setUrl(''); setV(null); setMsg('') } }, [open])

  async function load() {
    const id = parseVideoId(url)
    if (!id) { toast('Link do YouTube inválido.', 'err'); return }
    setBusy(true); setMsg('')
    const existing = (saved ?? []).find((x) => x.youtube_id === id)
    if (existing) { setV(existing); setBusy(false); return }
    const [title, tr] = await Promise.all([fetchTitle(id), fetchTranscript(id)])
    const base: Video = {
      id: uid(), updated_at: new Date().toISOString(), url: `https://www.youtube.com/watch?v=${id}`, youtube_id: id, title,
      transcript: tr.text, transcript_status: tr.status === 'ok' ? 'ok' : 'indisponivel', exercises: tr.status === 'ok' ? extractExercises(tr.text) : [], notes: '',
    }
    setV(base)
    setMsg(tr.status === 'ok' ? '' : tr.reason ?? 'Transcrição indisponível. Cole o texto abaixo ou adicione os exercícios manualmente.')
    setBusy(false)
  }

  const patch = (p: Partial<Video>) => setV((x) => (x ? { ...x, ...p } : x))
  const setEx = (i: number, p: Partial<VideoExercise>) => v && patch({ exercises: v.exercises.map((e, k) => (k === i ? { ...e, ...p } : e)) })

  async function save(): Promise<Video | null> {
    if (!v) return null
    return put(db.videos, { ...v, transcript_status: v.transcript_status === 'ok' ? 'ok' : v.transcript.trim() ? 'manual' : 'indisponivel' } as Video)
  }

  async function add() {
    if (!v) return
    const rows = v.exercises.filter((e) => e.selected && e.exercise_id).map((e) => ({ ex: findIn(catalog, e.exercise_id!)!, sets: e.sets, reps: e.reps, note: e.note })).filter((r) => r.ex)
    if (!rows.length) { toast('Selecione ao menos um exercício reconhecido.', 'err'); return }
    const sv = await save()
    onAdd(rows, sv ?? v)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide title="Importar de um vídeo do YouTube" footer={v ? (
      <div className="grid grid-cols-2 gap-2">
        <button className="btn" onClick={async () => { await save(); toast('Vídeo salvo.'); }}><Icon n="save" />Salvar vídeo</button>
        <button className="btn btn-primary" onClick={add}><Icon n="plus" />Adicionar ao treino</button>
      </div>
    ) : undefined}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input className="input" placeholder="Cole o link do vídeo" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} aria-label="Link do YouTube" />
          <button className="btn btn-primary" onClick={load} disabled={busy}>{busy ? '…' : 'Buscar'}</button>
        </div>
        {busy && <Spinner label="Buscando vídeo e transcrição…" />}

        {!v && !busy && (saved?.length ?? 0) > 0 && (
          <div>
            <span className="label">Vídeos salvos</span>
            <div className="space-y-2">{saved!.map((s) => <button key={s.id} className="card-flat p-3 w-full text-left flex items-center gap-3" onClick={() => setV(s)}><Icon n="video" className="text-accentink" /><span className="min-w-0"><b className="block truncate text-sm">{s.title || s.url}</b><span className="text-xs text-muted">{s.exercises.length} exercícios</span></span></button>)}</div>
          </div>
        )}

        {v && (
          <>
            <div className="card-flat p-3 space-y-2">
              <Field label="Nome do vídeo"><input className="input" value={v.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Nome do vídeo" /></Field>
              <a className="text-sm font-bold text-accentink inline-flex items-center gap-1.5 break-all" href={v.url} target="_blank" rel="noopener noreferrer"><Icon n="link" size={15} />{v.url}</a>
            </div>
            {msg && <p className="text-sm rounded-xl bg-[color-mix(in_srgb,var(--miss)_14%,transparent)] px-3 py-2">{msg}</p>}

            <Field label="Transcrição (editável)" hint="Uma linha por trecho. Pode começar com o tempo, como [1:25]. Edite à vontade antes de identificar os exercícios.">
              <textarea className="textarea !min-h-40 font-mono text-[13px]" value={v.transcript} onChange={(e) => patch({ transcript: e.target.value })} placeholder="Cole aqui a transcrição, se não foi possível obtê-la automaticamente." />
            </Field>
            <button className="btn btn-soft" onClick={() => { const ex = extractExercises(v.transcript); patch({ exercises: ex }); if (!ex.length) toast('Nenhum exercício conhecido foi encontrado na transcrição.', 'info') }}><Icon n="search" />Identificar exercícios</button>

            <div>
              <div className="flex items-center justify-between mb-2"><span className="label !m-0">Exercícios identificados ({v.exercises.length})</span>
                <button className="btn btn-sm" onClick={() => patch({ exercises: [...v.exercises, { name: '', exercise_id: catalog[0].id, start: null, sets: null, reps: '', note: '', selected: true }] })}><Icon n="plus" size={15} />Manual</button>
              </div>
              {!v.exercises.length && <p className="text-sm text-muted">Ainda nenhum. Use "Identificar exercícios" ou adicione manualmente.</p>}
              <div className="space-y-2">
                {v.exercises.map((e, i) => (
                  <div key={i} className="card-flat p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="w-5 h-5 accent-[var(--accent)]" checked={e.selected} onChange={(ev) => setEx(i, { selected: ev.target.checked })} aria-label={`Incluir ${e.name}`} />
                      <select className="select !min-h-10" value={e.exercise_id ?? ''} onChange={(ev) => { const ce = findIn(catalog, ev.target.value); setEx(i, { exercise_id: ev.target.value, name: ce?.name ?? e.name }) }} aria-label="Exercício da biblioteca">
                        {catalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button className="btn btn-icon !w-9 !min-h-9" onClick={() => patch({ exercises: v.exercises.filter((_, k) => k !== i) })} aria-label="Remover"><Icon n="x" size={16} /></button>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
                      <input className="input !min-h-10" inputMode="numeric" placeholder="Séries" value={e.sets ?? ''} onChange={(ev) => setEx(i, { sets: ev.target.value ? parseInt(ev.target.value, 10) || null : null })} aria-label="Séries" />
                      <input className="input !min-h-10" placeholder="Reps" value={e.reps} onChange={(ev) => setEx(i, { reps: ev.target.value })} aria-label="Repetições" />
                      <input className="input !min-h-10" placeholder="Observação" value={e.note} onChange={(ev) => setEx(i, { note: ev.target.value })} aria-label="Observação" />
                    </div>
                    {e.start !== null && <a className="text-xs font-bold text-accentink inline-flex items-center gap-1" href={`${v.url}&t=${e.start}s`} target="_blank" rel="noopener noreferrer"><Icon n="play" size={12} />Ver no vídeo ({Math.floor(e.start / 60)}:{String(e.start % 60).padStart(2, '0')})</a>}
                  </div>
                ))}
              </div>
            </div>
            <Field label="Observações importantes"><textarea className="textarea" value={v.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Dicas, aquecimento, tempo de descanso citado no vídeo…" /></Field>
          </>
        )}
      </div>
    </Modal>
  )
}
