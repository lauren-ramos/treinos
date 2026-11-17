// Ferramenta de desenvolvimento: gera PNGs com as poses de cada exercício (início/fim) para conferência visual.
import { it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { POSES } from '../data/poses'
import { Figure } from '../components/Figure'

const OUT = process.env.GALLERY_OUT ?? 'gallery-out'
const CSS = `
.fig-floor{stroke:#d9c9d2;stroke-width:2;stroke-linecap:round}
.fig-shadow{fill:#00000012}
.fig-eq{fill:#cdc3cc}.fig-metal{fill:#6d6473}.fig-bench{fill:#cfb8c8}.fig-pad{fill:#e29cc2}
.fig-eqline{stroke:#6d6473}.fig-cable{stroke:#6d6473;opacity:.65}.fig-plate{fill:#6d6473}.fig-hub{fill:#cdc3cc}`

const sub = (s: string) =>
  s.replaceAll('var(--fig-far)', '#bdb8c2').replaceAll('var(--fig-hl)', '#d8323f').replaceAll('var(--fig)', '#8a8590')

function svgOf(id: string, t: number, group: string) {
  const inner = renderToStaticMarkup(<Figure demo={POSES[id]} group={group} t={t} />)
  return sub(inner.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('>', `><style>${CSS}</style><rect y="-14" width="220" height="164" fill="#fbeaf3"/>`))
}

it('gera galeria', async () => {
  mkdirSync(OUT, { recursive: true })
  const ids = Object.keys(POSES)
  const per = 6
  for (let p = 0; p * per < ids.length; p++) {
    const chunk = ids.slice(p * per, p * per + per)
    const tiles: { input: Buffer; left: number; top: number }[] = []
    for (let i = 0; i < chunk.length; i++) {
      const id = chunk[i]
      for (const [j, t] of [0, 1].entries()) {
        const png = await sharp(Buffer.from(svgOf(id, t, 'Corpo todo')), { density: 144 }).resize(440, 328).png().toBuffer()
        tiles.push({ input: png, left: j * 450, top: i * 330 + 28 })
      }
      const label = await sharp({ create: { width: 900, height: 26, channels: 4, background: '#ffffff' } })
        .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="26"><text x="6" y="19" font-size="18" font-family="Arial" fill="#222">${id}</text></svg>`), left: 0, top: 0 }])
        .png().toBuffer()
      tiles.push({ input: label, left: 0, top: i * 330 })
    }
    const img = sharp({ create: { width: 900, height: chunk.length * 330, channels: 4, background: '#ffffff' } }).composite(tiles)
    writeFileSync(`${OUT}/g${p}.png`, await img.png().toBuffer())
  }
}, 60000)
