// Картинки для сайта установки (site/img/sprites): персонажи и растения из тех же спрайтов, что и атлас.
// На сайте они увеличиваются без сглаживания (image-rendering: pixelated).
//
// Запуск: npm run site-art

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { characterFrames } from './atlas/characters.mjs'
import { eastFrames } from './atlas/east.mjs'
import { manorFrames } from './atlas/manor.mjs'
import { encodePng } from './atlas/png.mjs'
import { plantFrames } from './atlas/plants.mjs'
import { propFrames } from './atlas/props.mjs'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site', 'img', 'sprites')
const frames = { ...propFrames(), ...eastFrames(), ...manorFrames(), ...plantFrames(), ...characterFrames() }

/** Обрезать прозрачные поля, чтобы спрайт стоял ровно по центру карточки. */
function trimmed(sprite) {
  let [x0, y0, x1, y1] = [sprite.w, sprite.h, -1, -1]
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      if (sprite.data[(y * sprite.w + x) * 4 + 3] === 0) continue
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
    }
  }
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) out.set(sprite.data.subarray(((y0 + y) * sprite.w + x0) * 4, ((y0 + y) * sprite.w + x1 + 1) * 4), y * w * 4)
  return { w, h, data: out }
}

const PICK = {
  sunflower: 'plant_sunflower_3',
  krupka: 'npc_krupka_0',
  myata: 'npc_myata_0',
  vereshk: 'npc_vereshk',
  shurshik: 'npc_shurshik_0',
  lily: 'prop_giant_lily_awakened',
  khmur: 'npc_khmur_0',
}

mkdirSync(OUT, { recursive: true })
for (const [name, key] of Object.entries(PICK)) {
  if (!frames[key]) throw new Error(`нет кадра ${key}`)
  const s = trimmed(frames[key])
  writeFileSync(join(OUT, `${name}.png`), encodePng(s.w, s.h, s.data))
  console.log(`${name}: ${s.w}×${s.h}`)
}
