let ctx: AudioContext | null = null

/** Precisa ser chamado dentro de um gesto do usuário para o navegador liberar o áudio (iOS). */
export function unlockAudio() {
  try {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = ctx ?? new C()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* sem áudio */ }
}

export function beep(times = 3) {
  try {
    unlockAudio()
    if (!ctx) return
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = i === times - 1 ? 1175 : 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.28)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.28 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.28 + 0.22)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.28)
      o.stop(ctx.currentTime + i * 0.28 + 0.25)
    }
  } catch { /* ignora */ }
}

export function vibrate(pattern: number | number[] = [250, 100, 250]) {
  try { if ('vibrate' in navigator) navigator.vibrate(pattern) } catch { /* ignora */ }
}

export const notificationsSupported = () => typeof Notification !== 'undefined'

export async function askNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

/** Notificação do sistema (quando autorizada). Usa o service worker para funcionar em Android/PWA. */
export async function notify(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, icon: '/pwa-192.png', badge: '/pwa-192.png', tag: 'meu-treino', vibrate: [200, 100, 200] } as NotificationOptions)
    else new Notification(title, { body, icon: '/pwa-192.png' })
  } catch { /* ignora */ }
}

let lock: WakeLockSentinel | null = null
/** Mantém a tela acesa durante o treino (quando o navegador permite). */
export async function keepAwake(on: boolean) {
  try {
    if (on) {
      if ('wakeLock' in navigator && !lock) {
        lock = await navigator.wakeLock.request('screen')
        lock.addEventListener('release', () => { lock = null })
      }
    } else if (lock) { await lock.release(); lock = null }
  } catch { /* ignora */ }
}
