import sharp from 'sharp'
import { readFileSync } from 'node:fs'
const svg = readFileSync('public/favicon.svg')
await sharp(svg).resize(192, 192).png().toFile('public/pwa-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/pwa-512.png')
await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png')
// maskable: conteúdo na zona segura (80%) com fundo cheio
const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#e0529c"/><g transform="translate(76 76) scale(.7)" stroke="#fff" stroke-width="30" stroke-linecap="round" fill="none"><path d="M150 190v132M362 190v132M100 230v52M412 230v52M150 256h212"/></g></svg>`
await sharp(Buffer.from(mask)).resize(512, 512).png().toFile('public/pwa-maskable-512.png')
console.log('ícones ok')
