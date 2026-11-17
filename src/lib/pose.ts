/**
 * Motor de poses: bonecos 2D em vetor, vistos de lado (ou de frente), definidos por ângulos.
 * Convenção de ângulos de membros: 0° = para baixo, 90° = para a frente (direita da tela), 180° = para cima.
 * Tronco: 0° = em pé, +90° = inclinado para a frente, -90° = deitado com a cabeça para a esquerda.
 */
export type V = [number, number]

export interface IK { to: V; bend?: 1 | -1; foot?: number }
export type Limb = [number, number, number?] | IK

export interface Pose {
  hip?: V // posição explícita do quadril (deitado/sentado)
  plant?: number // x do pé de apoio (quadril é calculado para o pé tocar o chão)
  torso: number
  neck?: number
  arm: Limb
  arm2?: Limb
  leg: Limb
  leg2?: Limb
}

export type Anchor = string | V

export type Prop =
  | { k: 'plate'; at: Anchor; r?: number; dx?: number; dy?: number }
  | { k: 'db'; at: Anchor; dx?: number; dy?: number }
  | { k: 'rect'; at?: Anchor; x?: number; y?: number; w: number; h: number; dx?: number; dy?: number; rot?: number; r?: number; c?: 'eq' | 'pad' | 'bench' | 'metal' }
  | { k: 'line'; from: Anchor; to: Anchor; dash?: boolean; w?: number; c?: 'eq' | 'cable' }
  | { k: 'circle'; at: Anchor; r: number; dx?: number; dy?: number; c?: 'eq' | 'metal' }

export interface FrontPose {
  arm: [number, number] // ângulo (a partir de baixo, para fora) do braço e do antebraço
  arm2?: [number, number]
  leg: [number, number]
  leg2?: [number, number]
  hipY?: number // opcional: altura do quadril (padrão: pés no chão)
  lean?: number
}

export interface Demo {
  view?: 'side' | 'front'
  a: Pose | FrontPose
  b: Pose | FrontPose
  props?: Prop[]
  /** Isométrico: sem movimento (ex.: prancha). */
  hold?: boolean
}

export const GROUND = 138
export const L = { torso: 38, neck: 5, head: 7.5, ua: 21, fa: 19, th: 30, sh: 29, foot: 10, ankle: 4 }

export const dir = (deg: number): V => {
  const r = (deg * Math.PI) / 180
  return [Math.sin(r), Math.cos(r)]
}
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]]
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k]

function ik(p0: V, T: V, l1: number, l2: number, bend: number): V {
  const dx = T[0] - p0[0]
  const dy = T[1] - p0[1]
  let d = Math.hypot(dx, dy)
  const dMax = l1 + l2 - 0.01
  const dMin = Math.abs(l1 - l2) + 0.01
  d = Math.min(Math.max(d, dMin), dMax)
  const ux = dx / (Math.hypot(dx, dy) || 1)
  const uy = dy / (Math.hypot(dx, dy) || 1)
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0))
  const bx = p0[0] + ux * a
  const by = p0[1] + uy * a
  // perpendicular "para a frente" quando o membro aponta para baixo
  return [bx + bend * h * uy, by - bend * h * ux]
}

export function isIK(l: Limb): l is IK {
  return !Array.isArray(l)
}

export interface Skeleton {
  hip: V; sh: V; head: V
  elbow: V; wrist: V; elbow2: V; wrist2: V
  knee: V; ankle: V; toe: V; heel: V
  knee2: V; ankle2: V; toe2: V; heel2: V
}

function legRel(l: Limb | undefined): { ankle: V; low: number } | null {
  if (!l || isIK(l)) return null
  const k = add(mul(dir(l[0]), L.th), [0, 0])
  const a = add(k, mul(dir(l[1]), L.sh))
  const toe = add(a, mul(dir(l[2] ?? 90), L.foot))
  return { ankle: a, low: Math.max(a[1] + L.ankle, toe[1] + 1.5) }
}

export function resolveSide(p: Pose): Skeleton {
  let hip: V
  if (p.hip) hip = p.hip
  else {
    const r1 = legRel(p.leg)
    const r2 = legRel(p.leg2 ?? p.leg)
    let sup = r1
    if (r1 && r2) sup = r2.low > r1.low ? r2 : r1
    if (!sup) sup = r2
    if (sup) hip = [(p.plant ?? 100) - sup.ankle[0], GROUND - sup.low]
    else hip = [100, 80]
  }
  const sh = add(hip, mul([Math.sin((p.torso * Math.PI) / 180), -Math.cos((p.torso * Math.PI) / 180)], L.torso))
  const tn = p.torso + (p.neck ?? 0)
  const head = add(sh, mul([Math.sin((tn * Math.PI) / 180), -Math.cos((tn * Math.PI) / 180)], L.neck + L.head))

  const limb = (origin: V, l: Limb, l1: number, l2: number, defBend: 1 | -1) => {
    if (isIK(l)) {
      const k = ik(origin, l.to, l1, l2, l.bend ?? defBend)
      const end = add(k, mul([l.to[0] - k[0], l.to[1] - k[1]], 1))
      // ponta do membro: alcança o alvo (limitado pelo comprimento)
      const dd = Math.hypot(l.to[0] - origin[0], l.to[1] - origin[1])
      const reach = Math.min(dd, l1 + l2 - 0.01)
      const e2: V = dd > 0 ? [origin[0] + ((l.to[0] - origin[0]) / dd) * reach, origin[1] + ((l.to[1] - origin[1]) / dd) * reach] : end
      return { mid: k, end: e2, foot: l.foot ?? 90 }
    }
    const k = add(origin, mul(dir(l[0]), l1))
    return { mid: k, end: add(k, mul(dir(l[1]), l2)), foot: l[2] ?? 90 }
  }
  const A = limb(sh, p.arm, L.ua, L.fa, -1)
  const A2 = limb(sh, p.arm2 ?? p.arm, L.ua, L.fa, -1)
  const G = limb(hip, p.leg, L.th, L.sh, 1)
  const G2 = limb(hip, p.leg2 ?? p.leg, L.th, L.sh, 1)
  const fx = (a: V, f: number): { toe: V; heel: V } => ({ toe: add(a, mul(dir(f), L.foot)), heel: add(a, mul(dir(f), -2.5)) })
  const f1 = fx(G.end, G.foot)
  const f2 = fx(G2.end, G2.foot)
  return {
    hip, sh, head,
    elbow: A.mid, wrist: A.end, elbow2: A2.mid, wrist2: A2.end,
    knee: G.mid, ankle: G.end, toe: f1.toe, heel: f1.heel,
    knee2: G2.mid, ankle2: G2.end, toe2: f2.toe, heel2: f2.heel,
  }
}

export interface FrontSkeleton {
  hip: V; sh: V; head: V; shL: V; shR: V; hipL: V; hipR: V
  elbowL: V; wristL: V; elbowR: V; wristR: V
  kneeL: V; ankleL: V; kneeR: V; ankleR: V
}

/** Vista frontal: simétrica; ângulos medidos para fora (esquerda da tela = L). */
export function resolveFront(p: FrontPose): FrontSkeleton {
  const cx = 110
  const legRelY = (l: [number, number]) => L.th * Math.cos((l[0] * Math.PI) / 180) + L.sh * Math.cos((l[1] * Math.PI) / 180)
  const l1 = p.leg
  const l2 = p.leg2 ?? p.leg
  const hipY = p.hipY ?? GROUND - L.ankle - Math.max(legRelY(l1), legRelY(l2))
  const hip: V = [cx, hipY]
  const sh: V = [cx + (p.lean ?? 0), hipY - L.torso]
  const head: V = [sh[0], sh[1] - (L.neck + L.head)]
  const shL: V = [sh[0] - 15, sh[1] + 2]
  const shR: V = [sh[0] + 15, sh[1] + 2]
  const hipL: V = [cx - 6, hipY]
  const hipR: V = [cx + 6, hipY]
  const outL = (o: V, a: number, len: number): V => [o[0] - Math.sin((a * Math.PI) / 180) * len, o[1] + Math.cos((a * Math.PI) / 180) * len]
  const outR = (o: V, a: number, len: number): V => [o[0] + Math.sin((a * Math.PI) / 180) * len, o[1] + Math.cos((a * Math.PI) / 180) * len]
  const aL = p.arm
  const aR = p.arm2 ?? p.arm
  const elbowL = outL(shL, aL[0], L.ua)
  const elbowR = outR(shR, aR[0], L.ua)
  const kneeL = outL(hipL, l1[0], L.th)
  const kneeR = outR(hipR, l2[0], L.th)
  return {
    hip, sh, head, shL, shR, hipL, hipR,
    elbowL, wristL: outL(elbowL, aL[1], L.fa), elbowR, wristR: outR(elbowR, aR[1], L.fa),
    kneeL, ankleL: outL(kneeL, l1[1], L.sh), kneeR, ankleR: outR(kneeR, l2[1], L.sh),
  }
}

/** Interpola recursivamente números (ângulos, coordenadas) entre duas poses de mesma estrutura. */
export function lerp<T>(a: T, b: T, t: number): T {
  if (typeof a === 'number' && typeof b === 'number') return (a + (b - a) * t) as T
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerp(v, b[i] ?? v, t)) as T
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const o: Record<string, unknown> = {}
    for (const k of Object.keys(a as object)) o[k] = lerp((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k] ?? (a as Record<string, unknown>)[k], t)
    return o as T
  }
  return a
}

export const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(Math.max(t, 0), 1))

/** Ciclo ida-e-volta com pausas nas pontas: 0→1→0. */
export function cycleT(ms: number, period = 3400): number {
  const p = (ms % period) / period // 0..1
  const hold = 0.12
  if (p < hold) return 0
  if (p < 0.5 - hold) return ease((p - hold) / (0.5 - 2 * hold))
  if (p < 0.5 + hold) return 1
  if (p < 1 - hold) return ease(1 - (p - (0.5 + hold)) / (0.5 - 2 * hold))
  return 0
}
