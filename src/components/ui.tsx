import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

/* ---------------- ícones ---------------- */
const P: Record<string, string> = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  calendar: 'M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M8 3v4M16 3v4',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  play: 'M6 3l14 9-14 9z',
  pause: 'M7 4v16M17 4v16',
  stop: 'M6 6h12v12H6z',
  check: 'M20 6 9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6',
  copy: 'M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  drag: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  chevL: 'm15 18-6-6 6-6',
  chevR: 'm9 18 6-6-6-6',
  chevD: 'm6 9 6 6 6-6',
  chevU: 'm18 15-6-6-6 6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h.01',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 16v-4M12 8h.01',
  wifi: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01',
  wifiOff: 'M3 3l18 18M2 9a15 15 0 0 1 5-3M10 5.2A15 15 0 0 1 22 9M5 12.5a10 10 0 0 1 4-2.4M14 10.3a10 10 0 0 1 5 2.2M8.5 16a5 5 0 0 1 3-1.4M12 20h.01',
  cloud: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 11 3.5 3.5 0 0 1 18 18z',
  sync: 'M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2M18 2v4h-4M6 22v-4h4',
  video: 'M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 10l5-3v10l-5-3',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  skip: 'M5 4l10 8-10 8zM19 5v14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 0 1-3.4 0',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  equal: 'M5 9h14M5 15h14',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  medal: 'M12 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 13 7 22l5-3 5 3-1.5-9',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  home2: 'M4 12l8-8 8 8M6 10v10h12V10',
  layers: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 17l10 5 10-5',
  save: 'M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 3v5h7V3M8 21v-7h8v7',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  camera: 'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM12 11a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7a2 2 0 1 1-2 2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
}

export type IconName = keyof typeof P

export function Icon({ n, size = 20, className = '', stroke = 2 }: { n: IconName | string; size?: number; className?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={P[n] ?? P.info} />
    </svg>
  )
}

/* ---------------- modal (bottom sheet) ---------------- */
export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`sheet ${wide ? 'wide' : ''}`}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
    >
      {open && (
        <>
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            <button className="btn btn-icon" onClick={onClose} aria-label="Fechar"><Icon n="x" /></button>
          </div>
          <div className="overflow-y-auto px-5 py-4 flex-1 min-h-0">{children}</div>
          {footer && <div className="px-5 py-3 border-t border-line safe-b">{footer}</div>}
        </>
      )}
    </dialog>
  )
}

/* ---------------- avisos (toast) ---------------- */
interface ToastItem { id: number; text: string; tone: 'ok' | 'err' | 'info' }
const ToastCtx = createContext<(text: string, tone?: ToastItem['tone']) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, tone: ToastItem['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, text, tone }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed left-0 right-0 bottom-24 md:bottom-6 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`page-in pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${t.tone === 'err' ? 'bg-danger text-white' : t.tone === 'info' ? 'bg-surface text-fg border border-line' : 'bg-fg text-bg'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------- confirmação ---------------- */
interface ConfirmOpts { title: string; text?: string; ok?: string; danger?: boolean }
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [o, setO] = useState<(ConfirmOpts & { res: (v: boolean) => void }) | null>(null)
  const ask = useCallback((opts: ConfirmOpts) => new Promise<boolean>((res) => setO({ ...opts, res })), [])
  const close = (v: boolean) => { o?.res(v); setO(null) }
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={!!o} onClose={() => close(false)} title={o?.title} footer={
        <div className="flex gap-3 justify-end">
          <button className="btn" onClick={() => close(false)}>Cancelar</button>
          <button className={`btn ${o?.danger ? 'btn-primary !bg-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>{o?.ok ?? 'Confirmar'}</button>
        </div>
      }>
        {o?.text && <p className="text-[15px] leading-relaxed text-muted">{o.text}</p>}
      </Modal>
    </ConfirmCtx.Provider>
  )
}

/* ---------------- pequenos blocos ---------------- */
export function Empty({ icon = 'info', title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card-flat p-8 text-center flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-2xl bg-accentsoft text-accentink grid place-items-center mb-1"><Icon n={icon} size={24} /></div>
      <b className="text-base">{title}</b>
      {text && <p className="text-sm text-muted max-w-sm">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-muted" role="status">
      <span className="w-5 h-5 rounded-full border-2 border-line border-t-accent animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function Ring({ value, max, size = 120, stroke = 11, children }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1 ml-1">{hint}</span>}
    </label>
  )
}

export function PageHeader({ eyebrow, title, right, sub }: { eyebrow?: string; title: string; right?: ReactNode; sub?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        {eyebrow && <div className="h-eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[28px] leading-8 font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
      </div>
      {right && <div className="shrink-0 flex gap-2">{right}</div>}
    </div>
  )
}
