// Сарай изнутри: дощатый пол, бревенчатые стены, ящик с замком, полка, стол с письмом,
// керосиновая лампа, угол под рогожей и дверь в сад. Тот же приём: плоские тона, шахматка, чёрный контур.

import { checker, noise, pick, rng, Sprite } from './canvas.mjs'
import { T } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

// --- Пол и стены ----------------------------------------------------------------------------

/** Половицы поперёк комнаты: доски по 8 пикселей, тёмные щели, редкие сучки и гвозди. */
function floor(seed) {
  const s = new Sprite(T, T)
  const r = rng(seed)
  for (let y = 0; y < T; y++) {
    const board = Math.floor(y / 8)
    const inBoard = y % 8
    // стык досок сдвинут от ряда к ряду, как на настоящем полу
    const joint = (board * 13 + 5) % T
    for (let x = 0; x < T; x++) {
      const n = noise(x, y, 6, board + seed, T)
      const tone = inBoard === 7 ? 0 : inBoard === 0 ? 4 : n > 0.7 ? 2 : 3
      s.px(x, y, x === joint && inBoard !== 7 ? R.oldWood[0] : R.oldWood[tone])
    }
  }
  for (let i = 0; i < 2; i++) {
    const x = 3 + Math.floor(r() * 26)
    const y = Math.floor(r() * 4) * 8 + 3
    s.px(x, y, R.oldWood[1])
    s.px(x + 1, y, R.oldWood[1])
    s.px(x, y + 1, R.oldWood[2])
  }
  if (r() > 0.4) s.px(4 + Math.floor(r() * 24), Math.floor(r() * 4) * 8 + 1, R.silver[2]) // гвоздь
  return s
}

/** Верх стены (вид сверху на брёвна): тёмный, с поперечными балками. */
function wallTop() {
  const s = new Sprite(T, T)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) s.px(x, y, (y % 16 === 0) ? R.wood[2] : checker(x, y) && y % 16 === 1 ? R.wood[1] : R.wood[0])
  return s
}

/** Лицевая сторона стены: горизонтальные брёвна с щелями; во втором варианте — окошко с лунным светом. */
function wallFace(windowed) {
  const s = new Sprite(T, T)
  for (let y = 0; y < T; y++) {
    const inRow = y % 5
    for (let x = 0; x < T; x++) {
      const tone = inRow === 4 ? 0 : inRow === 0 ? 4 : noise(x, Math.floor(y / 5), 6, 9, T) > 0.68 ? 2 : 3
      s.px(x, y, R.wood[tone])
    }
  }
  // плинтус внизу стены — граница с полом
  for (let x = 0; x < T; x++) {
    s.px(x, T - 2, R.wood[1])
    s.px(x, T - 1, INK)
  }
  if (windowed) {
    s.rect(9, 6, 14, 12, INK)
    for (let y = 7; y < 17; y++) for (let x = 10; x < 22; x++) s.px(x, y, pick(R.dew.slice(1, 4), 0.85 - (y - 7) / 14, x, y))
    s.rect(15, 7, 2, 10, R.wood[1])
    s.rect(10, 11, 12, 1, R.wood[1])
    s.px(12, 8, R.dew[4])
    s.rect(8, 18, 16, 2, R.wood[4]) // подоконник
  }
  return s
}

// --- Предметы -------------------------------------------------------------------------------

/** Ящик, обитый железом, с замком из трёх колёсиков; открыт — крышка откинута, внутри пусто. */
function toolbox(open) {
  const s = new Sprite(T, T)
  s.shadow(16, 28, 13, 2.5)
  const b = new Sprite(T, T)
  const top = open ? 14 : 11
  for (let y = top; y < 28; y++) for (let x = 4; x < 28; x++) b.px(x, y, R.wood[x < 6 ? 4 : x > 25 ? 2 : (y - top) % 6 === 5 ? 2 : 3])
  for (const x of [7, 24]) for (let y = top; y < 28; y++) b.px(x, y, R.silver[y === top ? 3 : 1]) // железные полосы
  if (open) {
    // откинутая крышка за ящиком и тёмное нутро
    for (let y = 4; y < 14; y++) for (let x = 4; x < 28; x++) b.px(x, y, R.wood[y < 6 ? 4 : 2])
    b.rect(5, 14, 22, 3, P.dark)
  } else {
    for (let x = 4; x < 28; x++) b.px(x, top, R.wood[5])
    // замок: латунная пластина с тремя колёсиками
    b.rect(12, 16, 9, 6, R.straw[2])
    for (const x of [13, 16, 19]) {
      b.px(x, 18, R.lamp[3])
      b.px(x, 19, R.straw[0])
    }
  }
  b.outline(INK)
  s.stamp(b)
  return s
}

/** Полка на стене: горшки, банка из-под семян и моток бечёвки. */
function shelf() {
  const s = new Sprite(2 * T, T)
  const p = new Sprite(2 * T, T)
  for (let x = 4; x < 60; x++) {
    p.px(x, 22, R.wood[4])
    p.px(x, 23, R.wood[2])
  }
  p.rect(8, 24, 2, 4, R.wood[1])
  p.rect(54, 24, 2, 4, R.wood[1])
  // горшки
  for (const [x, w] of [[10, 9], [22, 7]]) {
    for (let y = 13; y < 22; y++) for (let i = 0; i < w - Math.floor((y - 13) / 4); i++) p.px(x + Math.floor((y - 13) / 8) + i, y, R.rust[i === 0 ? 4 : i > w - 4 ? 2 : 3])
    p.rect(x - 1, 12, w + 2, 2, R.rust[4])
  }
  // банка
  for (let y = 10; y < 22; y++) for (let x = 36; x < 44; x++) p.px(x, y, x === 37 ? R.dew[4] : R.dew[2])
  p.rect(35, 9, 10, 2, R.silver[2])
  // бечёвка
  p.shadedEllipse(52, 18, 4, 4, R.straw.slice(1))
  p.outline(INK)
  s.stamp(p)
  return s
}

/** Стол с письмом и чашкой давно остывшего чая. */
function deskLetter() {
  const s = new Sprite(2 * T, T)
  s.shadow(32, 29, 28, 2.5)
  const d = new Sprite(2 * T, T)
  for (let y = 10; y < 16; y++) for (let x = 3; x < 61; x++) d.px(x, y, R.wood[y === 10 ? 5 : y > 13 ? 2 : 4])
  for (const x of [6, 55]) for (let y = 16; y < 29; y++) for (let i = 0; i < 3; i++) d.px(x + i, y, R.wood[i === 0 ? 3 : 1])
  d.outline(INK)
  s.stamp(d)
  // письмо: сложенный листок, строчки
  const l = new Sprite(2 * T, T)
  for (let y = 6; y < 13; y++) for (let x = 14; x < 30; x++) l.px(x, y, x > 26 ? R.bone[1] : R.bone[3])
  for (const y of [8, 10]) for (let x = 16; x < 26; x += 1) if ((x + y) % 4 !== 0) l.px(x, y, R.bone[0])
  // чашка
  l.shadedEllipse(42, 8, 3.5, 3, R.bone.slice(1))
  l.ellipse(42, 6.5, 2.5, 1, R.wood[1])
  l.px(46, 8, R.bone[2])
  l.outline(INK)
  s.stamp(l)
  return s
}

/** Керосиновая лампа на табурете: тёплое стекло, огонёк. */
function lamp() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 9, 2)
  const t = new Sprite(T, T)
  for (let y = 18; y < 21; y++) for (let x = 8; x < 24; x++) t.px(x, y, R.wood[y === 18 ? 4 : 3])
  for (const x of [9, 21]) for (let y = 21; y < 29; y++) t.rect(x, y, 2, 1, R.wood[2])
  t.outline(INK)
  s.stamp(t)
  const l = new Sprite(T, T)
  l.rect(12, 15, 8, 3, R.silver[1])
  for (let y = 6; y < 15; y++) for (let x = 12; x < 20; x++) l.px(x, y, pick(R.lamp.slice(2), 1 - Math.abs(x - 15.5) / 5 - (y < 8 ? 0.2 : 0), x, y))
  l.px(15, 9, R.lamp[5])
  l.px(16, 10, R.lamp[5])
  l.rect(13, 4, 6, 2, R.silver[2])
  l.rect(15, 2, 2, 2, R.silver[1])
  l.outline(INK)
  s.stamp(l)
  return s
}

/** Угол под рогожей: что-то бугрится; обыскан — рогожа откинута, в углу пусто. */
function sack(searched) {
  const s = new Sprite(T, T)
  s.shadow(16, 28, 12, 2.5)
  const g = new Sprite(T, T)
  if (searched) {
    for (let y = 22; y < 28; y++) for (let x = 6 + (27 - y); x < 27; x++) g.px(x, y, R.straw[(x + y) % 3 === 0 ? 1 : 2])
  } else {
    g.shadedEllipse(16, 20, 11, 8, R.straw.slice(0, 4), { bias: -0.1 })
    for (let y = 13; y < 28; y += 3) for (let x = 5; x < 28; x++) if ((x + y) % 4 === 0 && g.filled(x, y)) g.px(x, y, R.straw[0])
  }
  g.outline(INK)
  s.stamp(g)
  return s
}

/** Дверь в сад: проём в нижней стене, за ним ночная трава в лунном свете. */
function doorExit() {
  const s = new Sprite(T, T)
  for (let y = 0; y < T; y++) for (let x = 4; x < 28; x++) s.px(x, y, y > 20 ? (checker(x, y) ? R.grass[2] : R.grass[1]) : pick(R.dew.slice(0, 3), 0.75 - y / 40, x, y))
  const f = new Sprite(T, T)
  for (let y = 0; y < T; y++) {
    f.rect(1, y, 3, 1, R.wood[y % 6 === 5 ? 1 : 3])
    f.rect(28, y, 3, 1, R.wood[y % 6 === 5 ? 1 : 2])
  }
  f.outline(INK)
  s.stamp(f)
  // порог
  s.rect(4, 0, 24, 2, R.wood[4])
  s.rect(4, 2, 24, 1, INK)
  return s
}

export function interiorFrames() {
  return {
    floor_0: floor(1),
    floor_1: floor(2),
    floor_2: floor(3),
    wall_top: wallTop(),
    wall_face_0: wallFace(false),
    wall_face_1: wallFace(true),
    prop_toolbox: toolbox(false),
    prop_toolbox_open: toolbox(true),
    prop_shelf: shelf(),
    prop_desk_letter: deskLetter(),
    prop_lamp: lamp(),
    prop_sack: sack(false),
    prop_sack_searched: sack(true),
    prop_door_exit: doorExit(),
  }
}
