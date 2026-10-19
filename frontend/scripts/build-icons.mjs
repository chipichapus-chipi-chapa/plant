// Иконки приложения (PWA): Мята под исполинской лилией — как на заставке.
// Рисуются из тех же спрайтов, что и атлас, и увеличиваются без сглаживания.
//
// Запуск: npm run icons

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Sprite } from './atlas/canvas.mjs'
import { manorFrames } from './atlas/manor.mjs'
import { encodePng } from './atlas/png.mjs'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
const frames = manorFrames()

/** Наложить спрайт со смещением (прозрачные пиксели пропускаются). */
function blit(target, sprite, dx, dy) {
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      const i = (y * sprite.w + x) * 4
      const a = sprite.data[i + 3]
      if (a === 0) continue
      const hex = '#' + [0, 1, 2].map((k) => sprite.data[i + k].toString(16).padStart(2, '0')).join('')
      target.px(dx + x, dy + y, hex, a)
    }
  }
}

/**
 * Сцена 64×64. safe — доля, в которую должно уместиться главное: у «маскируемой» иконки
 * Android обрезает края кругом или скруглённым квадратом, поэтому рисунок сжимается к центру.
 */
function scene(safe) {
  const s = new Sprite(64, 64)
  // сумерки: сверху темнее, к земле теплее
  for (let y = 0; y < 64; y++) {
    const t = y / 63
    const c = [0x12 + t * 0x18, 0x0e + t * 0x13, 0x0d + t * 0x0c].map((v) => Math.round(v).toString(16).padStart(2, '0'))
    s.rect(0, y, 64, 1, '#' + c.join(''))
  }
  // светло-розовое свечение лилии
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const d = Math.hypot(x - 32, y - 26) / 30
      if (d < 1) s.px(x, y, '#f3b7c8', Math.round((1 - d) ** 2 * 70))
    }
  }
  const art = new Sprite(64, 64)
  blit(art, frames.prop_giant_lily_awakened, 0, -6) // цветок лилии над головой
  blit(art, frames.npc_myata_0, 16, 18) // Мята у стебля
  // уменьшение к центру для маскируемой иконки — по ближайшему пикселю, чтобы не мылить
  const k = 1 / safe
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const sx = Math.floor(32 + (x - 32) * k)
      const sy = Math.floor(32 + (y - 32) * k)
      if (sx < 0 || sy < 0 || sx >= 64 || sy >= 64) continue
      const i = (sy * 64 + sx) * 4
      if (art.data[i + 3] === 0) continue
      const hex = '#' + [0, 1, 2].map((n) => art.data[i + n].toString(16).padStart(2, '0')).join('')
      s.px(x, y, hex, art.data[i + 3])
    }
  }
  return s
}

/** Увеличение без сглаживания до size×size. */
function upscale(sprite, size) {
  const out = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.floor((x * sprite.w) / size)
      const sy = Math.floor((y * sprite.h) / size)
      out.set(sprite.data.subarray((sy * sprite.w + sx) * 4, (sy * sprite.w + sx) * 4 + 4), (y * size + x) * 4)
    }
  }
  return encodePng(size, size, out)
}

mkdirSync(OUT_DIR, { recursive: true })
const plain = scene(1)
const maskable = scene(0.8)
writeFileSync(join(OUT_DIR, 'icon-192.png'), upscale(plain, 192))
writeFileSync(join(OUT_DIR, 'icon-512.png'), upscale(plain, 512))
writeFileSync(join(OUT_DIR, 'maskable-512.png'), upscale(maskable, 512))
writeFileSync(join(OUT_DIR, 'apple-touch-icon.png'), upscale(plain, 180))
console.log(`иконки → ${OUT_DIR}`)
