// Поместье за чащей: старый дом с белёными стенами и тёмной черепицей, колодец, потухший фонарный столб;
// кухня — печь с еле тлеющим светом, стол с засохшим караваем, буфет с чашками; кошка Мята у печи.

import { checker, pick, rng, Sprite } from './canvas.mjs'
import { T } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

/** Дом 6×3 клетки: черепичная крыша с трубой, белёные стены в тёмных балках, тёмные окна, дверь. */
function manor() {
  const W = 6 * T
  const H = 3 * T
  const s = new Sprite(W, H)
  const r = rng(77)
  const b = new Sprite(W, H)
  const wallTop = 44
  const wallBottom = H - 4
  // стены: побелка в трещинках, фахверк
  for (let y = wallTop; y < wallBottom; y++)
    for (let x = 4; x < W - 4; x++) b.px(x, y, (x + y) % 23 === 0 ? R.bone[0] : y < wallTop + 3 ? R.bone[1] : R.bone[2])
  for (const x of [4, 36, 70, 124, 156, W - 8]) b.rect(x, wallTop, 4, wallBottom - wallTop, R.wood[1])
  b.rect(4, wallTop, W - 8, 3, R.wood[2])
  b.rect(4, wallBottom - 3, W - 8, 3, R.wood[1])
  // окна: тёмные, с крестовиной; в одном — еле заметный отблеск
  for (const x of [14, 46, 132, 164]) {
    b.rect(x - 1, 54, 16, 18, R.wood[1])
    b.rect(x, 55, 14, 16, x === 46 ? R.lamp[0] : P.dark)
    b.rect(x + 6, 55, 2, 16, R.wood[1])
    b.rect(x, 62, 14, 2, R.wood[1])
    b.rect(x - 2, 72, 18, 2, R.wood[3])
  }
  // дверь — над дорожкой (третья колонка дома)
  b.rect(96, 52, 30, wallBottom - 52, R.wood[1])
  for (let y = 54; y < wallBottom; y++) for (let x = 99; x < 123; x++) b.px(x, y, (x - 99) % 6 === 5 ? R.wood[1] : R.wood[3])
  b.px(118, 70, R.straw[4]) // ручка
  b.rect(94, 50, 34, 3, R.wood[4])
  // крыша: тёмная черепица рядами, конёк, свес
  for (let y = 4; y < wallTop + 2; y++) {
    const inset = Math.max(0, 14 - y)
    for (let x = inset; x < W - inset; x++) {
      const row = Math.floor((y - 4) / 5)
      const scale = (x + row * 4) % 8
      b.px(x, y, (y - 4) % 5 === 4 ? R.stone[0] : scale === 0 ? R.stone[1] : R.stone[2])
    }
  }
  for (let x = 14; x < W - 14; x++) b.px(x, 4, R.stone[4])
  for (let i = 0; i < 18; i++) b.px(10 + r() * (W - 20), 8 + r() * 30, R.leaf[2]) // мох на черепице
  // труба
  for (let y = 0; y < 16; y++) for (let x = 150; x < 162; x++) b.px(x, y, R.rust[x === 150 ? 4 : x === 161 ? 1 : 3])
  b.rect(148, 0, 16, 3, R.rust[2])
  b.outline(INK)
  s.shadow(W / 2, H - 2, W / 2 - 4, 4)
  s.stamp(b)
  return s
}

function well() {
  const s = new Sprite(T, T)
  s.shadow(16, 28, 12, 2.5)
  const w = new Sprite(T, T)
  // сруб
  for (let y = 16; y < 28; y++) for (let x = 5; x < 27; x++) w.px(x, y, (y - 16) % 4 === 3 ? R.stone[1] : (x + Math.floor((y - 16) / 4) * 3) % 7 === 0 ? R.stone[1] : R.stone[3])
  w.ellipse(16, 16, 11, 3, R.stone[4])
  w.ellipse(16, 16.5, 8.5, 2, P.dark)
  // стойки и крыша
  w.rect(6, 4, 2, 13, R.wood[2])
  w.rect(24, 4, 2, 13, R.wood[2])
  for (let y = 1; y < 6; y++) for (let x = 3 + (5 - y); x < 29 - (5 - y); x++) w.px(x, y, y === 1 ? R.wood[4] : R.wood[3])
  w.rect(8, 8, 16, 1, R.straw[2]) // ворот с верёвкой
  w.rect(15, 9, 1, 4, R.straw[2])
  w.rect(13, 13, 5, 3, R.wood[3]) // ведро
  w.outline(INK)
  s.stamp(w)
  return s
}

function lampPost() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 6, 2)
  const p = new Sprite(T, T)
  p.rect(15, 10, 3, 19, R.silver[1])
  p.rect(13, 28, 7, 2, R.silver[0])
  p.rect(11, 2, 11, 9, R.silver[0])
  p.rect(12, 3, 9, 7, R.dew[0]) // стекло потухшее
  p.px(13, 4, R.dew[2])
  p.rect(10, 1, 13, 2, R.silver[2])
  p.outline(INK)
  s.stamp(p)
  return s
}

/** Печь 2×1: белёный бок, чугунная дверца, за ней еле тлеет. */
function hearth() {
  const s = new Sprite(2 * T, T)
  const h = new Sprite(2 * T, T)
  for (let y = 2; y < 30; y++) for (let x = 4; x < 60; x++) h.px(x, y, x < 7 ? R.bone[3] : x > 56 ? R.bone[0] : y < 5 ? R.bone[3] : R.bone[2])
  for (let x = 4; x < 60; x += 9) h.rect(x, 2, 1, 28, R.bone[1])
  h.rect(18, 12, 26, 14, R.silver[0])
  for (let y = 14; y < 24; y++) for (let x = 20; x < 42; x++) h.px(x, y, y > 19 ? pick(R.lamp.slice(0, 3), (y - 19) / 6, x, y) : P.dark)
  h.rect(18, 26, 26, 2, R.silver[1])
  h.rect(28, 6, 6, 2, R.silver[1]) // заслонка
  h.outline(INK)
  s.stamp(h)
  return s
}

function breadTable() {
  const s = new Sprite(2 * T, T)
  s.shadow(32, 29, 28, 2.5)
  const t = new Sprite(2 * T, T)
  for (let y = 12; y < 17; y++) for (let x = 3; x < 61; x++) t.px(x, y, R.wood[y === 12 ? 5 : y > 15 ? 2 : 4])
  for (const x of [6, 55]) for (let y = 17; y < 29; y++) for (let i = 0; i < 3; i++) t.px(x + i, y, R.wood[i === 0 ? 3 : 1])
  t.outline(INK)
  s.stamp(t)
  const l = new Sprite(2 * T, T)
  l.shadedEllipse(26, 9, 9, 5, R.straw.slice(1)) // каравай
  for (const x of [21, 26, 31]) l.px(x, 7, R.straw[1])
  for (let y = 7; y < 12; y++) for (let x = 40; x < 50; x++) l.px(x, y, R.bone[3]) // записка
  l.rect(42, 9, 6, 1, R.bone[0])
  l.outline(INK)
  s.stamp(l)
  return s
}

function cupboard() {
  const s = new Sprite(T, T)
  const c = new Sprite(T, T)
  for (let y = 0; y < 30; y++) for (let x = 4; x < 28; x++) c.px(x, y, R.wood[x < 6 ? 4 : x > 25 ? 1 : 3])
  c.rect(7, 3, 18, 12, R.dew[0]) // стекло
  c.rect(15, 3, 2, 12, R.wood[2])
  for (const [x, col] of [[9, R.berry[3]], [12, R.lamp[3]], [19, R.dew[3]], [22, R.heather[4]]]) {
    c.rect(x, 10, 2, 3, col) // чашки в цветочек
    c.px(x, 9, R.bone[3])
  }
  c.rect(7, 18, 18, 10, R.wood[2])
  c.rect(15, 18, 2, 10, R.wood[1])
  c.outline(INK)
  s.stamp(c)
  return s
}

/** Кошка Мята: рыжая, сидит у печи, один глаз приоткрыт; кадр 1 — дёрнула хвостом. */
function myata(frame) {
  const s = new Sprite(32, 48)
  s.shadow(16, 46, 10, 1.5)
  const fur = ['#5a260c', '#9a4a14', '#c9742a', '#e39a52']
  const c = new Sprite(32, 48)
  const tail = frame ? [[24, 44], [26, 43], [28, 41], [29, 38], [28, 36]] : [[24, 44], [26, 44], [28, 43], [29, 41], [29, 39]]
  for (const [x, y] of tail) c.rect(x, y, 2, 2, fur[2])
  c.shadedEllipse(16, 40, 9, 6, fur, { bias: 0.05 })
  c.shadedEllipse(16, 30, 7, 6, fur, { bias: 0.1 })
  for (const x of [10, 22]) for (let y = 0; y < 5; y++) c.rect(x - (x < 16 ? 0 : y > 2 ? 1 : 0), 22 + y, 1 + y, 1, fur[2]) // уши
  for (let x = 12; x < 21; x += 3) c.px(x, 35, fur[1]) // полоски
  c.outline(INK)
  s.stamp(c)
  s.rect(12, 30, 3, 1, INK) // спящий глаз — щёлочка
  s.rect(18, 29, 2, 2, frame ? INK : R.lamp[4])
  if (!frame) s.px(18, 29, INK)
  s.px(16, 32, R.berry[4])
  return s
}

export function manorFrames() {
  return {
    prop_manor: manor(),
    prop_well: well(),
    prop_lamp_post: lampPost(),
    prop_hearth: hearth(),
    prop_bread_table: breadTable(),
    prop_cupboard: cupboard(),
    npc_myata_0: myata(0),
    npc_myata_1: myata(1),
  }
}

export { checker }
