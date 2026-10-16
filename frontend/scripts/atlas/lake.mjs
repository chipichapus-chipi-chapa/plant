// Туманное озеро: камыши у берега, старый причал с фонариком, лодка, скамейка «Агата + сад» и цапля Тишь.

import { checker, rng, Sprite } from './canvas.mjs'
import { grassFill, T } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

/** Камыши на берегу: высокие тёмные стебли с бурыми початками. */
function reeds(seed) {
  const s = new Sprite(T, T)
  grassFill(s, seed, { extras: false })
  const r = rng(seed)
  const t = new Sprite(T, T)
  for (let i = 0; i < 9; i++) {
    const x = 2 + Math.floor(r() * 28)
    const h = 14 + Math.floor(r() * 12)
    for (let k = 0; k < h; k++) t.px(x + (k > h - 4 ? 1 : 0), 31 - k, R.weed[k % 5 === 0 ? 2 : 3])
    if (r() > 0.4) t.rect(x, 31 - h - 3, 2, 4, R.wood[2]) // початок
  }
  t.outline(INK)
  s.stamp(t)
  return s
}

/** Причал 3×1: доски уходят в воду, сваи, фонарик на последнем столбике. */
function dock() {
  const s = new Sprite(3 * T, T)
  const d = new Sprite(3 * T, T)
  for (let x = 0; x < 3 * T; x++) for (let y = 8; y < 24; y++) d.px(x, y, x % 6 === 5 ? R.oldWood[0] : R.oldWood[y === 8 ? 4 : (x + y) % 9 === 0 ? 2 : 3])
  for (const x of [4, 40, 86]) d.rect(x, 24, 4, 6, R.oldWood[1]) // сваи
  d.rect(88, 0, 3, 10, R.wood[2]) // столбик
  d.rect(86, 0, 7, 6, R.silver[1]) // фонарик
  d.rect(87, 1, 5, 4, R.lamp[4])
  d.outline(INK)
  s.stamp(d)
  for (let x = 30; x < 80; x += 7) s.px(x, 15, R.oldWood[1]) // зарубки
  return s
}

/** Лодка 2×1, привязанная к причалу. */
function boat() {
  const s = new Sprite(2 * T, T)
  const b = new Sprite(2 * T, T)
  for (let y = 10; y < 24; y++) {
    const inset = Math.max(0, Math.abs(y - 17) - 3) * 2
    for (let x = 4 + inset; x < 60 - inset; x++) b.px(x, y, y < 12 ? R.wood[5] : y > 20 ? R.wood[1] : R.wood[3])
  }
  for (let y = 12; y < 20; y++) for (let x = 10; x < 54; x++) b.px(x, y, R.wood[2])
  b.rect(24, 12, 3, 8, R.wood[4]) // банка
  b.rect(38, 12, 3, 8, R.wood[4])
  b.line(30, 14, 48, 6, R.wood[3]) // весло
  b.outline(INK)
  s.stamp(b)
  s.line(0, 16, 4, 16, R.straw[3]) // верёвка к причалу
  return s
}

function bench() {
  const s = new Sprite(2 * T, T)
  s.shadow(32, 29, 26, 2)
  const b = new Sprite(2 * T, T)
  for (let y = 8; y < 16; y++) for (let x = 6; x < 58; x++) b.px(x, y, y % 4 === 3 ? R.wood[1] : R.wood[3]) // спинка
  for (let y = 18; y < 22; y++) for (let x = 4; x < 60; x++) b.px(x, y, y === 18 ? R.wood[5] : R.wood[3]) // сиденье
  for (const x of [8, 52]) b.rect(x, 22, 3, 7, R.wood[1])
  b.outline(INK)
  s.stamp(b)
  for (let x = 22; x < 42; x += 2) s.px(x, 11, R.wood[1]) // вырезанная надпись
  return s
}

/** Цапля Тишь: высокая, серая, стоит на одной ноге. Кадр 1 — чуть повернула голову. */
function tish(frame) {
  const s = new Sprite(32, 48)
  s.shadow(16, 46, 7, 1.5)
  const h = new Sprite(32, 48)
  h.rect(16, 34, 1, 12, R.lamp[1]) // нога
  h.line(17, 38, 20, 36, R.lamp[1]) // поджатая нога
  h.shadedEllipse(15, 30, 7, 5, R.silver, { bias: 0.05 }) // тело
  for (let x = 9; x < 18; x += 2) h.px(x, 32, R.silver[1]) // перья
  for (let y = 12; y < 26; y++) h.px(17 + Math.round(Math.sin(y / 3) * 1.5), y, R.silver[3]) // шея
  h.shadedEllipse(18 + frame, 11, 3, 2.5, R.silver.slice(1))
  h.line(20 + frame, 11, 27 + frame, 12, R.lamp[3]) // клюв
  h.line(15 + frame, 10, 12 + frame, 9, INK) // хохолок
  h.outline(INK)
  s.stamp(h)
  s.px(19 + frame, 10, INK)
  return s
}

export function lakeFrames() {
  const frames = {
    prop_dock: dock(),
    prop_boat: boat(),
    prop_bench: bench(),
    npc_tish_0: tish(0),
    npc_tish_1: tish(1),
  }
  for (let i = 0; i < 3; i++) frames[`reeds_${i}`] = reeds(500 + i * 11)
  return frames
}

export { checker, P }
