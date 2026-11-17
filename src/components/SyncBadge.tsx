import { useEffect } from 'react'
import { Icon } from './ui'
import { refreshPending, syncNow, useSyncState } from '../lib/sync'

/** Indicador de conexão: online/sincronizado, offline, sincronizando ou erro (com pendências). */
export function SyncBadge({ full }: { full?: boolean }) {
  const s = useSyncState()
  useEffect(() => { void refreshPending() }, [])
  const map = {
    local: { icon: 'save', text: 'Salvo neste aparelho', sub: 'Modo local, sem conta', tone: 'text-muted bg-surface2' },
    online: { icon: 'cloud', text: 'Online e sincronizado', sub: 'Tudo salvo na nuvem', tone: 'text-ok bg-[color-mix(in_srgb,var(--ok)_14%,transparent)]' },
    offline: { icon: 'wifiOff', text: 'Offline', sub: s.pending ? `${s.pending} alterações no aparelho` : 'Dados guardados no aparelho', tone: 'text-miss bg-[color-mix(in_srgb,var(--miss)_14%,transparent)]' },
    syncing: { icon: 'sync', text: 'Sincronizando…', sub: 'Enviando alterações', tone: 'text-plan bg-[color-mix(in_srgb,var(--plan)_14%,transparent)]' },
    error: { icon: 'alert', text: 'Erro ao sincronizar', sub: s.pending ? `${s.pending} pendentes de envio` : 'Toque para tentar de novo', tone: 'text-danger bg-[color-mix(in_srgb,var(--danger)_14%,transparent)]' },
  }[s.status]
  const click = () => { if (s.status !== 'local') void syncNow() }
  return (
    <button onClick={click} title={s.error ?? map.sub} aria-label={`${map.text}. ${map.sub}`} className={`inline-flex items-center gap-2 rounded-full ${map.tone} ${full ? 'w-full px-3 py-2.5 rounded-2xl text-left' : 'px-2.5 py-1.5'}`}>
      <Icon n={map.icon} size={16} className={s.status === 'syncing' ? 'animate-spin' : ''} />
      {full ? <span className="leading-tight"><b className="block text-xs">{map.text}</b><span className="text-[11px] opacity-80">{map.sub}</span></span> : <span className="text-xs font-bold">{s.status === 'local' ? 'Local' : s.status === 'online' ? 'Online' : s.status === 'offline' ? `Offline${s.pending ? ` · ${s.pending}` : ''}` : s.status === 'syncing' ? 'Sincronizando' : 'Erro'}</span>}
    </button>
  )
}
