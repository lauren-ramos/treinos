import { useEffect, useState } from 'react'

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: BIPEvent | null = null
const subs = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent; subs.forEach((f) => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()) })
}

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)

export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

/** Instalação do PWA: Android/desktop usam o prompt nativo; iOS exige "Adicionar à Tela de Início" pelo menu Compartilhar. */
export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => { subs.delete(f) } }, [])
  return {
    installed: isStandalone(),
    canPrompt: !!deferred,
    ios: isIOS() && !isStandalone(),
    install: async () => { if (!deferred) return; await deferred.prompt(); await deferred.userChoice; deferred = null; force((x) => x + 1) },
  }
}
