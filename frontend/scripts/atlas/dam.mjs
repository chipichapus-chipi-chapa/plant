// Глава 3, старая плотина: бревенчатая плотина, шлюз, хатка бобров и сами бобры.

import { rng, Sprite } from './canvas.mjs'
import { T } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

const FUR = ['#2a1a10', '#45291a', '#5f3a24', '#7a4e31', '#956643']
const TAIL = ['#1d1a1c', '#2c2830', '#3d3742', '#524a57']

/** Бревно поперёк: кора по краям, светлый спил на торце. */
function log(s, x, y, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.px(x + i, y + j, j === 0 ? R.wood[4] : j === h - 1 ? R.wood[1] : (i + j * 3) % 9 === 0 ? R.wood[2] : R.wood[3])
  s.shadedEllipse(x + w - 2, y + h / 2 - 0.5, 2, h / 2, R.straw.slice(2))
}

/** Плотина 4×1: брёвна и ветки поперёк реки, вода переливается тонкой струйкой. */
function dam() {
  const W = 4 * T
  const s = new Sprite(W, T)
  const b = new Sprite(W, T)
  log(b, 0, 6, W - 2, 6)
  log(b, 4, 13, W - 8, 6)
  log(b, 1, 20, W - 4, 6)
  const r = rng(31)
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * W)
    const y = 4 + Math.floor(r() * 22)
    b.line(x, y, x + 5 + Math.floor(r() * 6), y - 3 + Math.floor(r() * 6), R.wood[2])
  }
  for (const x of [8, 40, 72, 104]) b.rect(x, 2, 3, 26, R.wood[1]) // сваи
  b.outline(INK)
  s.stamp(b)
  // струйка воды через верх
  for (let x = 58; x < 70; x++) s.px(x, 27 + (x % 2), R.dew[4], 200)
  return s
}

/** Шлюз 1×1: деревянный затвор, забитый ветками. */
function sluice() {
  const s = new Sprite(T, T)
  const b = new Sprite(T, T)
  b.rect(4, 4, 3, 26, R.wood[2])
  b.rect(25, 4, 3, 26, R.wood[2])
  b.rect(4, 4, 24, 3, R.wood[4])
  b.rect(7, 9, 18, 18, R.wood[3])
  for (let y = 11; y < 27; y += 4) b.rect(7, y, 18, 1, R.wood[1])
  b.rect(14, 1, 4, 4, R.silver[1]) // ворот
  for (const [x0, y0, x1, y1] of [[2, 22, 28, 16], [4, 14, 27, 24], [8, 28, 26, 10]]) b.line(x0, y0, x1, y1, R.wood[1])
  for (const [x, y] of [[6, 20], [20, 14], [24, 25]]) b.rect(x, y, 2, 1, R.leaf[3])
  b.outline(INK)
  s.stamp(b)
  return s
}

/** Хатка бобров 2×2: пустое место (колышек и кучка веток) или готовый купол из веток с дверцей и мхом. */
function beaverLodge(built) {
  const W = 2 * T
  const H = 2 * T
  const s = new Sprite(W, H)
  const b = new Sprite(W, H)
  const r = rng(built ? 7 : 8)
  if (!built) {
    for (let i = 0; i < 14; i++) {
      const x = 14 + Math.floor(r() * 36)
      const y = 44 + Math.floor(r() * 12)
      b.line(x, y, x + 8, y - 2 + Math.floor(r() * 4), R.wood[2 + (i % 2)])
    }
    b.rect(30, 22, 2, 30, R.wood[3]) // колышек
    b.rect(26, 22, 10, 6, R.bone[2]) // табличка
    b.rect(28, 24, 6, 1, R.bone[0])
  } else {
    for (let y = 18; y < H - 6; y++) {
      const half = Math.sqrt(Math.max(0, 1 - ((y - (H - 6)) / (H - 24)) ** 2)) * 26
      for (let x = Math.round(32 - half); x <= Math.round(32 + half); x++) {
        const k = (x * 3 + y * 5) % 11
        b.px(x, y, k < 3 ? R.wood[1] : k < 7 ? R.wood[2] : R.wood[3])
      }
    }
    for (let i = 0; i < 18; i++) {
      const x = 10 + Math.floor(r() * 44)
      const y = 24 + Math.floor(r() * 30)
      b.line(x, y, x + 6, y - 2, R.wood[4])
    }
    for (let i = 0; i < 20; i++) b.px(14 + Math.floor(r() * 36), 18 + Math.floor(r() * 10), R.leaf[3]) // мох на макушке
    b.shadedEllipse(32, H - 12, 6, 6, [P.dark, P.dark, R.wood[0]]) // дверца
    b.rect(26, H - 7, 12, 1, R.wood[4])
  }
  b.outline(INK)
  s.shadow(32, H - 4, 26, 3)
  s.stamp(b)
  return s
}

/** Бобр: круглый, с плоским хвостом-лопатой и передними зубами; kid — бобрёнок поменьше. */
function beaver(kid, frame) {
  const s = new Sprite(32, 48)
  const k = kid ? 0.7 : 1
  s.shadow(16, 46, 9 * k, 1.5)
  const m = new Sprite(32, 48)
  // хвост: плоский, в сеточку, чуть покачивается
  const tx = 22 + (frame ? 1 : 0)
  m.shadedEllipse(tx, 44, 6 * k, 2.5 * k, TAIL)
  m.shadedEllipse(16, 46 - 8 * k, 8 * k, 7.5 * k, FUR, { bias: 0.05 }) // тело
  m.shadedEllipse(16, 46 - 18 * k, 6.5 * k, 5.5 * k, FUR, { bias: 0.1 }) // голова
  for (const dir of [-1, 1]) m.shadedEllipse(16 + dir * 5 * k, 46 - 22 * k, 1.8 * k, 1.8 * k, FUR) // ушки
  m.outline(INK)
  s.stamp(m)
  const hy = Math.round(46 - 18 * k)
  s.px(13 + (kid ? 1 : 0), hy - 1, INK)
  s.px(19 - (kid ? 1 : 0), hy - 1, INK)
  s.rect(15, hy + 1, 2, 1, INK) // нос
  s.rect(15, hy + 3, 2, 2, P.white) // зубы
  if (!kid && frame) s.px(20, hy - 2, P.white) // блик
  return s
}

export function damFrames() {
  return {
    prop_dam: dam(),
    prop_sluice: sluice(),
    prop_beaver_lodge: beaverLodge(false),
    prop_beaver_lodge_awakened: beaverLodge(true),
    npc_beaver_0: beaver(false, 0),
    npc_beaver_1: beaver(false, 1),
    npc_beaverkid_0: beaver(true, 0),
    npc_beaverkid_1: beaver(true, 1),
  }
}
