// Генератор временной графики «Там, где растёт».
//
// Рисует пиксель-арт процедурно и упаковывает его в атлас: public/assets/atlas.png + atlas.json.
// Настоящие ассеты заменят атлас целиком, если сохранят имена кадров.
// Приёмы и палитра — docs/ART_DIRECTION.md; модули — scripts/atlas/.
//
// Запуск: npm run atlas

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { characterFrames } from './atlas/characters.mjs'
import { eastFrames } from './atlas/east.mjs'
import { interiorFrames } from './atlas/interior.mjs'
import { lakeFrames } from './atlas/lake.mjs'
import { manorFrames } from './atlas/manor.mjs'
import { encodePng } from './atlas/png.mjs'
import { plantFrames } from './atlas/plants.mjs'
import { propFrames } from './atlas/props.mjs'
import { tileFrames } from './atlas/tiles.mjs'
import { uiFrames } from './atlas/ui.mjs'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets')

const frames = { ...tileFrames(), ...propFrames(), ...interiorFrames(), ...eastFrames(), ...manorFrames(), ...lakeFrames(), ...plantFrames(), ...characterFrames(), ...uiFrames() }

// Упаковка «полками»: кадры по убыванию высоты, слева направо
const ATLAS_W = 1024
const entries = Object.entries(frames).sort(([, a], [, b]) => b.h - a.h)
const placed = {}
let cx = 0
let cy = 0
let shelf = 0
for (const [name, sprite] of entries) {
  if (cx + sprite.w > ATLAS_W) {
    cx = 0
    cy += shelf
    shelf = 0
  }
  placed[name] = { x: cx, y: cy, w: sprite.w, h: sprite.h }
  cx += sprite.w
  shelf = Math.max(shelf, sprite.h)
}
const ATLAS_H = cy + shelf

const atlas = new Uint8ClampedArray(ATLAS_W * ATLAS_H * 4)
for (const [name, sprite] of entries) {
  const { x, y } = placed[name]
  for (let j = 0; j < sprite.h; j++) {
    const src = j * sprite.w * 4
    atlas.set(sprite.data.subarray(src, src + sprite.w * 4), ((y + j) * ATLAS_W + x) * 4)
  }
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'atlas.png'), encodePng(ATLAS_W, ATLAS_H, atlas))
writeFileSync(
  join(OUT_DIR, 'atlas.json'),
  JSON.stringify({ image: 'atlas.png', tileSize: 32, frames: Object.fromEntries(Object.keys(frames).sort().map((k) => [k, placed[k]])) }, null, 2) + '\n',
)
console.log(`atlas: ${ATLAS_W}×${ATLAS_H}, кадров: ${Object.keys(frames).length} → ${OUT_DIR}`)
