import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Field, Icon, Modal, PageHeader, Spinner, useConfirm, useToast } from '../components/ui'
import { useAuth } from '../lib/auth'
import { db, alive, getProfile, put, saveProfile, softDelete, SYNC_TABLES } from '../lib/db'
import { DIAS_CURTOS, todayKey } from '../lib/dates'
import { ACHIEVEMENTS, goalProgress, useAppData } from '../lib/stats'
import { askNotificationPermission, notificationsSupported } from '../lib/notify'
import { useInstall } from '../lib/pwa'
import { useSyncState, syncNow } from '../lib/sync'
import { uid } from '../lib/id'
import { LIB_BY_ID } from '../data/library'
import type { Goal, GoalKind } from '../lib/types'
import type { Table } from 'dexie'

const GOAL_KINDS: { kind: GoalKind; label: string; unit: string; def: number }[] = [
  { kind: 'weekly_sessions', label: 'Treinar X vezes por semana', unit: 'vezes', def: 3 },
  { kind: 'monthly_sessions', label: 'Completar X treinos no mês', unit: 'treinos', def: 12 },
  { kind: 'streak', label: 'Manter uma sequência de X dias treinados', unit: 'dias', def: 7 },
  { kind: 'exercise_load', label: 'Chegar a uma carga em um exercício', unit: 'kg', def: 20 },
  { kind: 'week_complete', label: 'Completar todos os treinos planejados da semana', unit: '', def: 1 },
]

async function resizePhoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const s = Math.min(bmp.width, bmp.height)
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size)
  return c.toDataURL('image/jpeg', 0.82)
}

export default function Profile() {
  const toast = useToast()
  const confirm = useConfirm()
  const auth = useAuth()
  const sync = useSyncState()
  const install = useInstall()
  const d = useAppData()
  const p = useLiveQuery(() => getProfile(), [], undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [g, setG] = useState<{ kind: GoalKind; target: number; exercise_id: string }>({ kind: 'weekly_sessions', target: 3, exercise_id: '' })
  const exOptions = useLiveQuery(async () => { const m = new Map<string, string>(); for (const s of alive(await db.session_sets.toArray())) m.set(s.exercise_id, s.exercise_name); return [...m.entries()] }, [], [])
  if (!p || !d.ready) return <Spinner />
  const set = (patch: Parameters<typeof saveProfile>[0]) => saveProfile(patch)
  const unlocked = new Set(d.achievements.map((a) => a.key))
  const unlockedCount = unlocked.size
  const goals = d.goals.map((x) => goalProgress(x, d))

  async function toggleNotif() {
    if (p!.notifications) { await set({ notifications: false }); return }
    const r = await askNotificationPermission()
    if (r === 'granted') { await set({ notifications: true }); toast('Notificações ativadas.') }
    else toast('Permissão negada. Ative nas configurações do navegador.', 'err')
  }

  async function addGoal() {
    const kind = GOAL_KINDS.find((k) => k.kind === g.kind)!
    const name = g.kind === 'exercise_load' ? (exOptions?.find(([id]) => id === g.exercise_id)?.[1] ?? LIB_BY_ID[g.exercise_id]?.name ?? '') : ''
    if (g.kind === 'exercise_load' && !g.exercise_id) { toast('Escolha o exercício.', 'err'); return }
    await put(db.goals, { id: uid(), kind: g.kind, target: g.kind === 'week_complete' ? 1 : g.target, exercise_id: g.exercise_id, exercise_name: name, active: true, created_on: todayKey(), achieved_at: null } as Goal)
    setGoalOpen(false)
    toast(`Meta criada: ${kind.label.replace('X', String(g.target))}.`)
  }

  async function exportData() {
    const out: Record<string, unknown[]> = {}
    for (const t of SYNC_TABLES) out[t] = await (db[t] as unknown as Table).toArray()
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `meu-treino-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const Toggle = ({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) => (
    <button className="w-full flex items-center justify-between gap-3 py-2.5 text-left" onClick={onClick} role="switch" aria-checked={on}>
      <span><b className="block text-[15px]">{label}</b>{hint && <span className="text-xs text-muted">{hint}</span>}</span>
      <span className={`w-12 h-7 rounded-full p-0.5 transition shrink-0 ${on ? 'bg-accent' : 'bg-surface2 border border-line'}`}><i className={`block w-6 h-6 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : ''}`} /></span>
    </button>
  )

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Perfil" title="Você e suas preferências" />

      <div className="hero p-5">
        <div className="flex items-center gap-4 relative z-10">
          <button className="relative w-20 h-20 rounded-3xl overflow-hidden bg-white/25 grid place-items-center shrink-0 ring-4 ring-white/30" onClick={() => fileRef.current?.click()} aria-label="Trocar foto">
            {p.photo ? <img src={p.photo} alt="Sua foto" className="w-full h-full object-cover" /> : <Icon n="user" size={34} />}
            <span className="absolute bottom-0 right-0 bg-white text-[#a4246a] rounded-tl-xl p-1"><Icon n="camera" size={14} /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { await set({ photo: await resizePhoto(f) }) } catch { toast('Não foi possível usar essa imagem.', 'err') } } }} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold tracking-[.14em] opacity-90">SEU PERFIL</div>
            <div className="text-2xl font-extrabold leading-7 truncate">{p.name || 'Sem nome'}</div>
            <div className="text-[13px] opacity-90 mt-0.5">{d.sessions.length} treino{d.sessions.length === 1 ? '' : 's'} · {unlockedCount} conquista{unlockedCount === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div className="mt-4 relative z-10">
          <input className="input !bg-white/20 !border-white/30 !text-inherit placeholder:!text-white/70" defaultValue={p.name} onBlur={(e) => set({ name: e.target.value.trim() })} placeholder="Como quer ser chamado(a)" aria-label="Nome" />
          {p.photo && <button className="text-xs font-bold mt-2 underline" onClick={() => set({ photo: '' })}>Remover foto</button>}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <b className="text-lg block">Treino</b>
        <Field label="Objetivos"><textarea className="textarea" defaultValue={p.goal_text} onBlur={(e) => set({ goal_text: e.target.value })} placeholder="Ex.: ganhar força, definir pernas e glúteos, melhorar o condicionamento…" /></Field>
        <div><span className="label">Preferência de treino</span><div className="seg">{(['academia', 'casa', 'ambos'] as const).map((x) => <button key={x} className={p.preferred_location === x ? 'on' : ''} onClick={() => set({ preferred_location: x })}>{x === 'ambos' ? 'Os dois' : x === 'casa' ? 'Em casa' : 'Academia'}</button>)}</div></div>
        <div><span className="label">Dias disponíveis para treinar</span><div className="flex gap-1.5 flex-wrap">{DIAS_CURTOS.map((x, i) => <button key={x} className={`chip ${p.available_days.includes(i) ? 'on' : ''}`} onClick={() => set({ available_days: p.available_days.includes(i) ? p.available_days.filter((k) => k !== i) : [...p.available_days, i].sort() })}>{x}</button>)}</div></div>
      </div>

      <div className="card p-5">
        <b className="text-lg block mb-1">Cronômetro e descanso</b>
        <Field label="Descanso padrão entre séries"><select className="select" value={p.default_rest} onChange={(e) => set({ default_rest: parseInt(e.target.value, 10) })}>{[30, 45, 60, 75, 90, 120, 150, 180].map((s) => <option key={s} value={s}>{s} segundos</option>)}</select></Field>
        <div className="divide-y divide-line mt-2">
          <Toggle on={p.auto_rest} label="Descanso automático" hint="Inicia a contagem assim que você conclui uma série" onClick={() => set({ auto_rest: !p.auto_rest })} />
          <Toggle on={p.sound} label="Aviso sonoro" hint="Toca quando o descanso termina" onClick={() => set({ sound: !p.sound })} />
          <Toggle on={p.vibrate} label="Vibração" hint="Quando o aparelho permitir" onClick={() => set({ vibrate: !p.vibrate })} />
          <Toggle on={p.keep_awake} label="Manter a tela ligada durante o treino" onClick={() => set({ keep_awake: !p.keep_awake })} />
          {notificationsSupported() && <Toggle on={p.notifications} label="Notificações" hint="Aviso de fim de descanso com o app em segundo plano (depende do aparelho)" onClick={toggleNotif} />}
        </div>
      </div>

      <div className="card p-5">
        <b className="text-lg block mb-2">Aparência</b>
        <div className="seg">{([['light', 'Claro', 'sun'], ['dark', 'Escuro', 'moon'], ['system', 'Automático', 'eye']] as const).map(([k, l, i]) => <button key={k} className={p.theme === k ? 'on' : ''} onClick={() => set({ theme: k })}><Icon n={i} size={15} className="inline mr-1.5" />{l}</button>)}</div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3"><b className="text-lg">Metas</b><button className="btn btn-soft btn-sm" onClick={() => setGoalOpen(true)}><Icon n="plus" size={16} />Nova meta</button></div>
        {!goals.length && <p className="text-sm text-muted">Defina metas simples, como treinar 3 vezes por semana. Quando alcançar, ganha conquistas.</p>}
        <div className="space-y-4">
          {goals.map((x) => (
            <div key={x.goal.id}>
              <div className="flex items-center justify-between gap-2 text-sm"><span className="font-semibold flex items-center gap-1.5">{x.goal.achieved_at && <Icon n="trophy" size={15} className="text-miss" />}{x.label.replace(/X/, String(x.target))}</span>
                <span className="flex items-center gap-2"><span className="text-muted tnum">{Math.round(x.current * 10) / 10}/{x.target}</span><button className="text-muted" aria-label="Excluir meta" onClick={async () => { if (await confirm({ title: 'Excluir meta?', ok: 'Excluir', danger: true })) await softDelete(db.goals, x.goal.id) }}><Icon n="x" size={16} /></button></span></div>
              <div className="pb mt-1.5"><i style={{ width: `${x.pct * 100}%` }} /></div>
              {x.goal.achieved_at && <p className="text-xs text-ok font-bold mt-1">Meta alcançada!</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <b className="text-lg block mb-3">Conquistas <span className="text-muted text-sm font-semibold">{unlocked.size}/{ACHIEVEMENTS.length}</span></b>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.key} className={`rounded-2xl p-3 border ${unlocked.has(a.key) ? 'border-accent bg-accentsoft' : 'border-line bg-surface2 opacity-60'}`}>
              <div className={`w-10 h-10 rounded-xl grid place-items-center ${unlocked.has(a.key) ? 'bg-accent text-onaccent' : 'bg-surface text-muted'}`}><Icon n={a.icon} /></div>
              <b className="block text-sm mt-2 leading-tight">{a.title}</b><span className="text-xs text-muted">{a.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <b className="text-lg block">Conta, instalação e dados</b>
        {auth.configured ? (auth.user ? (
          <div className="flex items-center justify-between gap-3 flex-wrap"><span className="text-sm">Conectado como <b>{auth.user.email}</b></span>
            <div className="flex gap-2"><button className="btn btn-sm" onClick={() => syncNow()}><Icon n="sync" size={15} />Sincronizar</button>
              <button className="btn btn-sm btn-danger" onClick={async () => { const r = await auth.signOut(); if (!r.ok) toast(`Ainda há ${r.pending} alterações sem enviar. Conecte-se à internet e tente de novo.`, 'err') }}><Icon n="logout" size={15} />Sair</button></div>
          </div>
        ) : <p className="text-sm text-muted">Você está no modo local (dados só neste aparelho). <button className="font-bold text-accentink" onClick={() => { try { localStorage.removeItem('meu-treino:local-mode') } catch { /* ignora */ } location.reload() }}>Entrar para sincronizar</button></p>)
          : <p className="text-sm text-muted">Modo local: seus dados ficam salvos neste aparelho. Para sincronizar entre aparelhos, configure o Supabase (veja o README).</p>}
        <p className="text-xs text-muted">Sincronização: {sync.status === 'local' ? 'desativada' : sync.status === 'online' ? 'em dia' : sync.status === 'offline' ? 'sem internet' : sync.status === 'syncing' ? 'em andamento' : 'com erro'}{sync.pending ? ` · ${sync.pending} pendentes` : ''}{sync.status === 'error' && sync.error ? ` · erro: ${sync.error}` : ''}{sync.lastSync ? ` · última: ${new Date(sync.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
        <div className="flex gap-2 flex-wrap">
          {install.canPrompt && !install.installed && <button className="btn btn-sm btn-soft" onClick={install.install}><Icon n="download" size={15} />Instalar app</button>}
          {install.installed && <span className="chip on"><Icon n="check" size={13} />App instalado</span>}
          {install.ios && <span className="text-xs text-muted">iPhone/iPad: no Safari, toque em Compartilhar → Adicionar à Tela de Início.</span>}
          <button className="btn btn-sm" onClick={exportData}><Icon n="download" size={15} />Exportar backup (JSON)</button>
        </div>
      </div>

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title="Nova meta" footer={<button className="btn btn-primary w-full" onClick={addGoal}>Criar meta</button>}>
        <div className="space-y-4">
          <Field label="Tipo de meta"><select className="select" value={g.kind} onChange={(e) => { const k = GOAL_KINDS.find((x) => x.kind === e.target.value)!; setG({ ...g, kind: k.kind, target: k.def }) }}>{GOAL_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select></Field>
          {g.kind !== 'week_complete' && <Field label={`Valor (${GOAL_KINDS.find((k) => k.kind === g.kind)!.unit})`}><input className="input" inputMode="decimal" value={g.target} onChange={(e) => setG({ ...g, target: parseFloat(e.target.value.replace(',', '.')) || 0 })} /></Field>}
          {g.kind === 'exercise_load' && (
            <Field label="Exercício" hint="Aparecem os exercícios que você já registrou em algum treino."><select className="select" value={g.exercise_id} onChange={(e) => setG({ ...g, exercise_id: e.target.value })}><option value="">Escolha…</option>{(exOptions ?? []).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></Field>
          )}
        </div>
      </Modal>
    </div>
  )
}
