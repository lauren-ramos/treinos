import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GROUND, cycleT, lerp, resolveFront, resolveSide,
  type Anchor, type Demo, type FrontPose, type Pose, type Prop, type V,
} from '../lib/pose'

/** Quais partes do boneco ficam destacadas, conforme o grupo muscular. */
const HL: Record<string, string[]> = {
  Peito: ['torso', 'uarm'],
  Costas: ['torso', 'uarm'],
  Ombros: ['uarm'],
  'Bíceps': ['uarm', 'farm'],
  'Tríceps': ['uarm', 'farm'],
  'Quadríceps': ['thigh'],
  Posteriores: ['thigh', 'glute'],
  'Glúteos': ['glute', 'thigh'],
  Panturrilhas: ['shin'],
  'Abdômen': ['torso'],
  'Corpo todo': ['torso', 'uarm', 'farm', 'thigh', 'shin', 'glute'],
}

type Pts = Record<string, V>

function pts(demo: Demo, t: number): Pts {
  if (demo.view === 'front') {
    const p = lerp(demo.a as FrontPose, demo.b as FrontPose, t)
    const s = resolveFront(p)
    return { ...s, shoulder: s.sh } as unknown as Pts
  }
  const p = lerp(demo.a as Pose, demo.b as Pose, t)
  const s = resolveSide(p)
  return { ...s, shoulder: s.sh } as unknown as Pts
}

function at(P: Pts, a: Anchor | undefined, dx = 0, dy = 0): V {
  if (!a) return [dx, dy]
  const b: V = typeof a === 'string' ? (P[a] ?? [0, 0]) : a
  return [b[0] + dx, b[1] + dy]
}

const Seg = ({ a, b, w, c, o = 1 }: { a: V; b: V; w: number; c: string; o?: number }) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeLinecap="round" opacity={o} />
)

function renderProp(p: Prop, P: Pts, i: number) {
  switch (p.k) {
    case 'rect': {
      const [x, y] = p.at ? at(P, p.at, p.dx, p.dy) : [p.x ?? 0, p.y ?? 0]
      const cls = p.c === 'bench' ? 'fig-bench' : p.c === 'pad' ? 'fig-pad' : p.c === 'metal' ? 'fig-metal' : 'fig-eq'
      return <rect key={i} className={cls} x={x} y={y} width={p.w} height={p.h} rx={p.r ?? 2} transform={p.rot ? `rotate(${p.rot} ${x} ${y})` : undefined} />
    }
    case 'line': {
      const a = at(P, p.from)
      const b = at(P, p.to)
      return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={p.c === 'cable' ? 'fig-cable' : 'fig-eqline'} strokeWidth={p.w ?? 2} strokeDasharray={p.dash ? '3 3' : undefined} strokeLinecap="round" />
    }
    case 'circle': {
      const [x, y] = at(P, p.at, p.dx, p.dy)
      return <circle key={i} className={p.c === 'metal' ? 'fig-metal' : 'fig-eq'} cx={x} cy={y} r={p.r} />
    }
    default:
      return null
  }
}

function renderHeld(p: Prop, P: Pts, i: number) {
  if (p.k === 'plate') {
    const [x, y] = at(P, p.at, p.dx, p.dy)
    const r = p.r ?? 11
    return (
      <g key={i}>
        <circle cx={x} cy={y} r={r} className="fig-plate" />
        <circle cx={x} cy={y} r={r * 0.3} className="fig-hub" />
      </g>
    )
  }
  if (p.k === 'db') {
    const [x, y] = at(P, p.at, p.dx, p.dy)
    return (
      <g key={i}>
        <circle cx={x} cy={y} r={6.2} className="fig-plate" />
        <circle cx={x} cy={y} r={2} className="fig-hub" />
      </g>
    )
  }
  return null
}

export function Figure({ demo, group, t, className }: { demo: Demo; group: string; t: number; className?: string }) {
  const P = useMemo(() => pts(demo, t), [demo, t])
  const hl = HL[group] ?? []
  const on = (k: string) => (hl.includes(k) ? 'var(--fig-hl)' : 'var(--fig)')
  const far = 'var(--fig-far)'
  const behind = (demo.props ?? []).filter((p) => p.k !== 'plate' && p.k !== 'db')
  const held = (demo.props ?? []).filter((p) => p.k === 'plate' || p.k === 'db')
  const off = (v: V, x = -3.5): V => [v[0] + x, v[1]]

  return (
    <svg viewBox="0 -14 220 164" className={className} role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <ellipse cx="110" cy={GROUND + 3} rx="88" ry="3.5" className="fig-shadow" />
      <line x1="8" y1={GROUND} x2="212" y2={GROUND} className="fig-floor" />
      {behind.map((p, i) => renderProp(p, P, i))}
      {demo.view === 'front' ? <FrontBody P={P} on={on} far={far} /> : <SideBody P={P} on={on} far={far} off={off} />}
      {held.map((p, i) => renderHeld(p, P, i))}
    </svg>
  )
}

function SideBody({ P, on, far, off }: { P: Pts; on: (k: string) => string; far: string; off: (v: V, x?: number) => V }) {
  const S = P as Record<string, V>
  return (
    <g>
      {/* membros do lado oposto (mais ao fundo) */}
      <Seg a={off(S.hip, -2)} b={off(S.knee2)} w={9.5} c={far} />
      <Seg a={off(S.knee2)} b={off(S.ankle2)} w={7.5} c={far} />
      <Seg a={off(S.ankle2)} b={off(S.toe2)} w={5} c={far} />
      <Seg a={off(S.sh, -2)} b={off(S.elbow2, -2)} w={6.5} c={far} />
      <Seg a={off(S.elbow2, -2)} b={off(S.wrist2, -2)} w={5.5} c={far} />
      {/* tronco e cabeça */}
      <Seg a={S.hip} b={S.sh} w={15.5} c={on('torso')} />
      <circle cx={S.hip[0]} cy={S.hip[1]} r={8.4} fill={on('glute') === 'var(--fig-hl)' ? 'var(--fig-hl)' : on('torso')} />
      <Seg a={S.sh} b={S.head} w={4.5} c="var(--fig)" />
      <ellipse cx={S.head[0] - 8} cy={S.head[1] + 3} rx={3.6} ry={6.5} fill="var(--fig-far)" transform={`rotate(25 ${S.head[0] - 8} ${S.head[1] + 3})`} />
      <circle cx={S.head[0]} cy={S.head[1]} r={7.6} fill="var(--fig)" />
      {/* membros do lado da câmera */}
      <Seg a={S.hip} b={S.knee} w={10} c={on('thigh')} />
      <Seg a={S.knee} b={S.ankle} w={7.8} c={on('shin')} />
      <Seg a={S.ankle} b={S.toe} w={5} c="var(--fig)" />
      <Seg a={S.sh} b={S.elbow} w={7} c={on('uarm')} />
      <Seg a={S.elbow} b={S.wrist} w={5.8} c={on('farm')} />
      <circle cx={S.sh[0]} cy={S.sh[1]} r={4.6} fill={on('uarm')} />
    </g>
  )
}

function FrontBody({ P, on, far }: { P: Pts; on: (k: string) => string; far: string }) {
  const S = P as Record<string, V>
  void far
  return (
    <g>
      <Seg a={S.hipL} b={S.kneeL} w={10} c={on('thigh')} />
      <Seg a={S.kneeL} b={S.ankleL} w={7.8} c={on('shin')} />
      <Seg a={S.hipR} b={S.kneeR} w={10} c={on('thigh')} />
      <Seg a={S.kneeR} b={S.ankleR} w={7.8} c={on('shin')} />
      <Seg a={[S.ankleL[0], S.ankleL[1] + 2]} b={[S.ankleL[0] - 6, S.ankleL[1] + 2]} w={5} c="var(--fig)" />
      <Seg a={[S.ankleR[0], S.ankleR[1] + 2]} b={[S.ankleR[0] + 6, S.ankleR[1] + 2]} w={5} c="var(--fig)" />
      <Seg a={S.hip} b={S.sh} w={22} c={on('torso')} />
      <circle cx={S.hip[0]} cy={S.hip[1]} r={10} fill={on('glute') === 'var(--fig-hl)' ? 'var(--fig-hl)' : on('torso')} />
      <Seg a={S.shL} b={S.shR} w={9} c={on('uarm')} />
      <Seg a={S.sh} b={S.head} w={5} c="var(--fig)" />
      <circle cx={S.head[0]} cy={S.head[1]} r={7.6} fill="var(--fig)" />
      <Seg a={S.shL} b={S.elbowL} w={7} c={on('uarm')} />
      <Seg a={S.elbowL} b={S.wristL} w={5.8} c={on('farm')} />
      <Seg a={S.shR} b={S.elbowR} w={7} c={on('uarm')} />
      <Seg a={S.elbowR} b={S.wristR} w={5.8} c={on('farm')} />
    </g>
  )
}

/** Controla t (0→1→0). `mode`: 'play' anima; 'a' / 'b' congela no início / fim. */
export function useCycle(mode: 'play' | 'a' | 'b', hold?: boolean): number {
  const [t, setT] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (mode !== 'play' || hold) {
      setT(mode === 'b' ? 1 : 0)
      return
    }
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setT(0)
      return
    }
    const t0 = performance.now()
    let last = 0
    const loop = (now: number) => {
      if (now - last > 30) {
        last = now
        setT(cycleT(now - t0))
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [mode, hold])
  return t
}

/** Demonstração animada com controle de reprodução opcional. */
export function DemoPlayer({ demo, group, controls = true, className = '' }: { demo: Demo; group: string; controls?: boolean; className?: string }) {
  const [mode, setMode] = useState<'play' | 'a' | 'b'>('play')
  const t = useCycle(mode, demo.hold)
  return (
    <div className={`demo ${className}`}>
      <Figure demo={demo} group={group} t={demo.hold && mode === 'play' ? 0 : t} className="w-full h-full" />
      {controls && !demo.hold && (
        <div className="demo-ctl" role="group" aria-label="Controle da demonstração">
          <button className={mode === 'a' ? 'on' : ''} onClick={() => setMode('a')} aria-pressed={mode === 'a'}>Início</button>
          <button className={mode === 'play' ? 'on' : ''} onClick={() => setMode('play')} aria-pressed={mode === 'play'}>Animar</button>
          <button className={mode === 'b' ? 'on' : ''} onClick={() => setMode('b')} aria-pressed={mode === 'b'}>Fim</button>
        </div>
      )}
      {demo.hold && controls && <div className="demo-ctl"><span className="px-3 py-1 text-xs opacity-70">Posição isométrica: mantenha parado</span></div>}
    </div>
  )
}

export function StaticFigure({ demo, group, className }: { demo: Demo; group: string; className?: string }) {
  return <Figure demo={demo} group={group} t={0} className={className} />
}
