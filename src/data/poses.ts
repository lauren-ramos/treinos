import type { Demo, FrontPose, Pose, Prop } from '../lib/pose'
import { GROUND } from '../lib/pose'

const side = (a: Pose, b: Pose, props: Prop[] = [], hold = false): Demo => ({ view: 'side', a, b, props, hold })
const front = (a: FrontPose, b: FrontPose, props: Prop[] = []): Demo => ({ view: 'front', a, b, props })

const bench = (x: number, y: number, w: number, h = 7): Prop => ({ k: 'rect', x, y, w, h, c: 'bench', r: 3 })
const post = (x: number, y1: number, y2 = GROUND): Prop => ({ k: 'line', from: [x, y1], to: [x, y2], w: 3 })
const BB = (at = 'wrist', r = 9, dy = 0): Prop => ({ k: 'plate', at, r, dy })
const DB = (at = 'wrist'): Prop => ({ k: 'db', at })

/* ----- posições de pé (pés plantados em x=96) ----- */
const squatArms: [number, number] = [-30, 150]

export const POSES: Record<string, Demo> = {
  'agachamento-livre': side(
    { plant: 96, torso: 4, arm: squatArms, leg: [0, 0] },
    { plant: 96, torso: 42, neck: -28, arm: squatArms, leg: [95, -32] },
    [{ k: 'plate', at: 'shoulder', r: 11, dx: -2 }],
  ),
  'agachamento-goblet': side(
    { plant: 96, torso: 3, arm: [10, 160], leg: [0, 0] },
    { plant: 96, torso: 24, neck: -14, arm: [10, 160], leg: [93, -30] },
    [DB()],
  ),
  'agachamento-corporal': side(
    { plant: 96, torso: 3, arm: [90, 90], leg: [0, 0] },
    { plant: 96, torso: 38, neck: -26, arm: [90, 90], leg: [92, -30] },
  ),
  'leg-press': side(
    { hip: [78, 112], torso: -58, neck: 12, arm: [30, 80], leg: { to: [125.5, 79], bend: 1, foot: 215 } },
    { hip: [78, 112], torso: -58, neck: 12, arm: [30, 80], leg: { to: [107.5, 91.5], bend: 1, foot: 215 } },
    [
      { k: 'line', from: [66, 122], to: [30, 80], w: 8, c: 'eq' },
      { k: 'line', from: [64, 123], to: [94, 123], w: 6, c: 'eq' },
      { k: 'line', from: [40, 134], to: [150, 66], w: 2.5, c: 'eq' },
      { k: 'rect', at: 'ankle', dx: 4, dy: -23, w: 5, h: 44, rot: -35, c: 'metal' },
    ],
  ),
  afundo: side(
    { plant: 118, torso: 3, arm: [2, 2], leg: [24, 24], leg2: { to: [70, 130], bend: 1, foot: 50 } },
    { plant: 118, torso: 3, arm: [2, 2], leg: [88, -6], leg2: { to: [70, 130], bend: 1, foot: 50 } },
    [DB()],
  ),
  bulgaro: side(
    { plant: 120, torso: 6, arm: [2, 2], leg: [24, 24], leg2: { to: [58, 106], bend: 1, foot: -10 } },
    { plant: 120, torso: 10, arm: [2, 2], leg: [88, -6], leg2: { to: [58, 106], bend: 1, foot: -10 } },
    [DB(), bench(26, 108, 40, 6), post(32, 114), post(60, 114)],
  ),
  extensora: side(
    { hip: [86, 108], torso: -8, arm: [24, 70], leg: [88, 0] },
    { hip: [86, 108], torso: -8, arm: [24, 70], leg: [88, 86] },
    [
      bench(66, 112, 46, 7),
      { k: 'rect', x: 62, y: 62, w: 9, h: 52, c: 'pad', r: 4 },
      post(72, 119),
      { k: 'rect', at: 'ankle', dx: -6, dy: -8, w: 11, h: 6, c: 'pad', r: 3 },
    ],
  ),
  flexora: side(
    { hip: [100, 103], torso: 86, arm: [88, 92], leg: [-90, -90, 0] },
    { hip: [100, 103], torso: 86, arm: [88, 92], leg: [-90, -165, -75] },
    [
      bench(36, 111, 118, 7),
      post(46, 118),
      post(146, 118),
      { k: 'rect', at: 'ankle', dx: -6, dy: -9, w: 11, h: 6, c: 'pad', r: 3 },
    ],
  ),
  stiff: side(
    { plant: 96, torso: 2, arm: [4, 4], leg: [0, 0] },
    { plant: 96, torso: 62, neck: -35, arm: [-12, -12], leg: [18, 6] },
    [BB('wrist', 8)],
  ),
  'bom-dia': side(
    { plant: 96, torso: 3, arm: squatArms, leg: [4, 2] },
    { plant: 96, torso: 68, neck: -30, arm: squatArms, leg: [18, 6] },
    [{ k: 'plate', at: 'shoulder', r: 9, dx: -2 }],
  ),
  terra: side(
    { plant: 96, torso: 50, neck: -30, arm: [0, 0], leg: [78, -28] },
    { plant: 96, torso: 0, arm: [0, 0], leg: [0, 0] },
    [BB('wrist', 14, 5)],
  ),
  panturrilha: side(
    { plant: 96, torso: 0, arm: [3, 3], leg: [0, 0, 90] },
    { plant: 96, torso: 0, arm: [3, 3], leg: [0, 0, 22] },
    [DB()],
  ),
  'hip-thrust': side(
    { hip: [89.5, 126], torso: -51, arm: { to: [89.5, 117], bend: -1 }, leg: { to: [128, 134], bend: 1 } },
    { hip: [98, 102], torso: -90, arm: { to: [98, 93], bend: -1 }, leg: { to: [128, 134], bend: 1 } },
    [
      bench(26, 110, 48, 28),
      { k: 'plate', at: 'hip', r: 10, dy: -9 },
    ],
  ),
  ponte: side(
    { hip: [100, 130], torso: -90, arm: [90, 90], leg: { to: [126, 134], bend: 1 } },
    { hip: [94.3, 110], torso: -122, arm: [90, 90], leg: { to: [126, 134], bend: 1 } },
  ),
  'coice-polia': side(
    { plant: 100, torso: 36, neck: -26, arm: [72, 80], leg: [4, -3], leg2: [16, -14] },
    { plant: 100, torso: 36, neck: -26, arm: [72, 80], leg: [4, -3], leg2: [-36, -40] },
    [
      { k: 'rect', x: 4, y: 72, w: 14, h: 66, c: 'eq', r: 3 },
      { k: 'line', from: 'ankle2', to: [18, 128], c: 'cable' },
      { k: 'rect', x: 164, y: 78, w: 5, h: 60, c: 'eq' },
    ],
  ),
  'abducao-pe': front(
    { arm: [28, 14], leg: [0, 0], leg2: [0, 0] },
    { arm: [28, 14], leg: [0, 0], leg2: [42, 42] },
    [{ k: 'circle', at: 'ankleR', r: 4, c: 'metal' }],
  ),
  'remada-curvada': side(
    { plant: 96, torso: 68, neck: -36, arm: [0, 0], leg: [28, -10] },
    { plant: 96, torso: 68, neck: -36, arm: [-100, 15], leg: [28, -10] },
    [BB('wrist', 8)],
  ),
  'puxada-frente': side(
    { hip: [96, 100], torso: -8, arm: [172, 176], leg: [80, -5] },
    { hip: [96, 100], torso: -8, arm: [-20, 135], leg: [80, -5] },
    [
      bench(74, 106, 48, 6),
      { k: 'rect', at: 'knee', dx: -8, dy: -15, w: 15, h: 7, c: 'pad', r: 3 },
      post(74, 112),
      { k: 'line', from: 'wrist', to: [112, 6], c: 'cable' },
      { k: 'circle', at: [112, 8], r: 4, c: 'metal' },
      { k: 'circle', at: 'wrist', r: 3, c: 'metal' },
    ],
  ),
  'remada-sentada': side(
    { hip: [82, 124], torso: 22, arm: [80, 85], leg: [80, 95, 100] },
    { hip: [82, 124], torso: -4, arm: [-65, 90], leg: [80, 95, 100] },
    [
      bench(58, 131, 42, 7),
      { k: 'rect', x: 148, y: 104, w: 5, h: 34, c: 'eq' },
      { k: 'line', from: 'wrist', to: [204, 96], c: 'cable' },
      { k: 'circle', at: 'wrist', r: 3, c: 'metal' },
    ],
  ),
  superman: side(
    { hip: [90, 127], torso: 90, neck: 0, arm: [90, 90], leg: [-90, -90, -90] },
    { hip: [90, 127], torso: 80, neck: -12, arm: [106, 106], leg: [-98, -100, -100] },
  ),
  'supino-halteres': side(
    { hip: [96, 100], torso: -90, arm: [70, 175], leg: { to: [128, 134], bend: 1 } },
    { hip: [96, 100], torso: -90, arm: [178, 178], leg: { to: [128, 134], bend: 1 } },
    [bench(40, 108, 76, 7), post(46, 115), post(108, 115), DB()],
  ),
  flexao: side(
    { hip: [89.5, 100], torso: 82, neck: -10, arm: { to: [136, 134], bend: -1 }, leg: { to: [40, 128], bend: 1, foot: 50 } },
    { hip: [97, 121], torso: 88, neck: -10, arm: { to: [136, 134], bend: -1 }, leg: { to: [40, 128], bend: 1, foot: 50 } },
  ),
  desenvolvimento: side(
    { plant: 96, torso: 0, arm: [30, 178], leg: [0, 0] },
    { plant: 96, torso: 0, arm: [176, 178], leg: [0, 0] },
    [DB()],
  ),
  'elevacao-lateral': front(
    { arm: [8, 8], leg: [0, 0] },
    { arm: [88, 84], leg: [0, 0] },
    [DB('wristL'), DB('wristR')],
  ),
  'elevacao-frontal': side(
    { plant: 96, torso: 0, arm: [3, 3], leg: [0, 0] },
    { plant: 96, torso: 0, arm: [88, 88], leg: [0, 0] },
    [DB()],
  ),
  'rosca-direta': side(
    { plant: 96, torso: 0, arm: [3, 3], leg: [0, 0] },
    { plant: 96, torso: 0, arm: [3, 152], leg: [0, 0] },
    [BB('wrist', 8)],
  ),
  'rosca-martelo': side(
    { plant: 96, torso: 0, arm: [3, 3], leg: [0, 0] },
    { plant: 96, torso: 0, arm: [3, 152], leg: [0, 0] },
    [DB()],
  ),
  'triceps-corda': side(
    { plant: 90, torso: 8, arm: [4, 102], leg: [0, 0] },
    { plant: 90, torso: 8, arm: [4, 14], leg: [0, 0] },
    [
      { k: 'line', from: 'wrist', to: [120, 8], c: 'cable' },
      { k: 'circle', at: [120, 8], r: 4, c: 'metal' },
      { k: 'circle', at: 'wrist', r: 3, c: 'metal' },
    ],
  ),
  'triceps-testa': side(
    { hip: [96, 100], torso: -90, arm: [180, -60], leg: { to: [128, 134], bend: 1 } },
    { hip: [96, 100], torso: -90, arm: [180, 180], leg: { to: [128, 134], bend: 1 } },
    [bench(40, 108, 76, 7), post(46, 115), post(108, 115), BB('wrist', 6)],
  ),
  'triceps-coice': side(
    { plant: 96, torso: 68, neck: -32, arm: [-88, 0], arm2: [30, 30], leg: [28, -10] },
    { plant: 96, torso: 68, neck: -32, arm: [-88, -92], arm2: [30, 30], leg: [28, -10] },
    [DB()],
  ),
  prancha: side(
    { hip: [91.1, 120], torso: 76, neck: -6, arm: [0, 90], leg: { to: [33, 131], bend: 1, foot: 45 } },
    { hip: [91.1, 119], torso: 76, neck: -6, arm: [0, 90], leg: { to: [33, 131], bend: 1, foot: 45 } },
    [],
    true,
  ),
  'abdominal-crunch': side(
    { hip: [100, 130], torso: -90, arm: [150, -60], leg: { to: [126, 134], bend: 1 } },
    { hip: [100, 130], torso: -62, neck: 10, arm: [150, -60], leg: { to: [126, 134], bend: 1 } },
  ),
  'elevacao-pernas': side(
    { hip: [110, 130], torso: -90, arm: [90, 90], leg: [95, 95, 185] },
    { hip: [110, 130], torso: -90, arm: [90, 90], leg: [178, 178, 268] },
  ),
  'abdominal-polia': side(
    { plant: 66, torso: 8, arm: [18, 165], leg: [0, -90, -45] },
    { plant: 66, torso: 58, neck: 30, arm: [55, 165], leg: [0, -90, -45] },
    [
      { k: 'line', from: 'wrist', to: [120, 6], c: 'cable' },
      { k: 'circle', at: [120, 8], r: 4, c: 'metal' },
    ],
  ),
  polichinelo: front(
    { arm: [8, 8], leg: [4, 4], hipY: 75.1 },
    { arm: [160, 170], leg: [28, 28], hipY: 69 },
  ),
  'joelho-alto': side(
    { plant: 100, torso: 3, arm: [-40, 50], arm2: [40, 100], leg: [90, 0], leg2: [0, 0] },
    { plant: 100, torso: 3, arm: [40, 100], arm2: [-40, 50], leg: [0, 0], leg2: [90, 0] },
  ),
  sumo: front(
    { arm: [-14, -30], leg: [22, 22] },
    { arm: [-14, -30], leg: [62, 0] },
    [DB('wristL')],
  ),
}
