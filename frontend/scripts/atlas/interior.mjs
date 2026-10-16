// Сарай изнутри. Планировка — как в комнатах Inscryption: восьмиугольный пятачок утоптанной земли
// посреди чёрной пустоты. Материалы — как в нашем саду: бревенчатая кромка стен с балкой,
// деревянная мебель с железными оковками, зелёное стекло и тёплая лампа.
// Плоские тона, шахматка на переходах, почти чёрный контур.

import { checker, noise, pick, rng, Sprite } from './canvas.mjs'
import { T } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

const N = 1
const E = 2
const S = 4
const W = 8
const VOID = P.dark
/** Насколько срезан угол комнаты (по диагонали, в пикселях). */
const CUT = 12

const BOTTLE = ['#1f3a1c', '#2f5a26', '#4f8a3a', '#7ab84a', '#b6e07a']

// --- Пол ------------------------------------------------------------------------------------

/**
 * Земляной пол по маске соседей-пола (N=1, E=2, S=4, W=8). У стены земля темнеет шахматкой,
 * а там, где стены сходятся углом, угол срезан по диагонали — за ним пустота.
 */
function floor(mask) {
  const s = new Sprite(T, T)
  const r = rng(500 + mask)
  const open = (side) => !!(mask & side)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      // расстояние до ближайшей стены (стороны без соседа) и до среза угла
      let d = Infinity
      if (!open(N)) d = Math.min(d, y)
      if (!open(S)) d = Math.min(d, T - 1 - y)
      if (!open(W)) d = Math.min(d, x)
      if (!open(E)) d = Math.min(d, T - 1 - x)
      const corners = [
        [!open(N) && !open(W), x + y],
        [!open(N) && !open(E), T - 1 - x + y],
        [!open(S) && !open(W), x + T - 1 - y],
        [!open(S) && !open(E), T - 1 - x + T - 1 - y],
      ]
      let cut = false
      for (const [on, sum] of corners) {
        if (!on) continue
        if (sum < CUT) cut = true
        d = Math.min(d, Math.floor((sum - CUT) / 1.4))
      }
      if (cut) {
        s.px(x, y, VOID)
        continue
      }
      // основа: ровная земля с пятнами чуть темнее и редкими светлыми крупинками
      // пятна редкие и крупные (период — клетка, без шва), чтобы пол читался ровным, без узора
      const n = noise(x, y, 16, 31, T)
      let color = n < 0.2 && checker(x, y) ? R.dirt[2] : R.dirt[3]
      if (d < 1) color = R.wood[2] // деревянный плинтус у самой стены
      else if (d < 3) color = R.dirt[0]
      else if (d < 5) color = checker(x, y) ? R.dirt[1] : R.dirt[2]
      else if (d < 7 && checker(x, y)) color = R.dirt[2]
      s.px(x, y, color)
    }
  for (let i = 0; i < 4; i++) {
    const x = 6 + Math.floor(r() * 20)
    const y = 6 + Math.floor(r() * 20)
    s.px(x, y, r() > 0.5 ? R.dirt[4] : R.dirt[1])
  }
  return s
}

// --- Стены ----------------------------------------------------------------------------------

/**
 * Стена — пустота, а со стороны пола (маска соседей-пола) — бревенчатая кромка.
 * Над комнатой (пол снизу) кромка толще: брёвна и балка вдоль стены.
 */
function wall(mask) {
  const s = new Sprite(T, T)
  s.rect(0, 0, T, T, VOID)
  const r = rng(700 + mask)
  if (mask & S) {
    // брёвна
    for (let y = 14; y < 26; y++)
      for (let x = 0; x < T; x++) {
        const row = Math.floor((y - 14) / 4)
        const seam = (y - 14) % 4 === 3 || (x + row * 5) % 10 === 0
        s.px(x, y, seam ? R.wood[0] : (x + row * 5) % 10 === 1 ? R.wood[2] : R.wood[1])
      }
    // балка
    for (let x = 0; x < T; x++) {
      s.px(x, 18, INK)
      s.px(x, 19, R.wood[4])
      s.px(x, 20, R.wood[3])
      s.px(x, 21, R.wood[2])
      s.px(x, 22, INK)
    }
    if (r() > 0.5) s.rect(10 + Math.floor(r() * 12), 17, 3, 7, R.silver[1]) // железная скоба
    s.rect(0, 26, T, 1, R.wood[3])
    s.rect(0, 27, T, 5, R.wood[1])
    s.rect(0, 31, T, 1, INK)
  }
  if (mask & N) {
    s.rect(0, 0, T, 2, R.wood[2])
    s.rect(0, 2, T, 2, R.wood[1])
    for (let x = 2; x < T - 4; x += 9) if (r() > 0.4) s.rect(x, 4, 5, 2, R.wood[1]) // торцы брёвен
  }
  if (mask & W) {
    s.rect(0, 0, 2, T, R.wood[2])
    s.rect(2, 0, 2, T, R.wood[1])
    for (let y = 3; y < T - 4; y += 8) if (r() > 0.4) s.rect(4, y, 2, 4, R.wood[1])
  }
  if (mask & E) {
    s.rect(T - 2, 0, 2, T, R.wood[2])
    s.rect(T - 4, 0, 2, T, R.wood[1])
    for (let y = 3; y < T - 4; y += 8) if (r() > 0.4) s.rect(T - 6, y, 2, 4, R.wood[1])
  }
  return s
}

// --- Предметы -------------------------------------------------------------------------------

/** Шляпки гвоздей в ряд — у мебели сарая. */
function rivets(s, x0, x1, y, step = 4) {
  for (let x = x0; x <= x1; x += step) s.px(x, y, R.silver[3])
}

/** Деревянный ящик в железных оковках, с латунным замком из трёх колёсиков; открыт — крышка откинута, внутри пусто. */
function toolbox(open) {
  const s = new Sprite(T, T)
  s.shadow(16, 28, 13, 2.5)
  const b = new Sprite(T, T)
  const top = open ? 14 : 11
  for (let y = top; y < 28; y++) for (let x = 4; x < 28; x++) b.px(x, y, R.wood[x < 6 ? 4 : x > 25 ? 1 : y < top + 2 ? 4 : 2])
  for (const x of [7, 24]) for (let y = top; y < 28; y++) b.px(x, y, R.silver[y === top ? 3 : 1]) // железные полосы
  rivets(b, 6, 26, 26)
  if (open) {
    for (let y = 3; y < 14; y++) for (let x = 4; x < 28; x++) b.px(x, y, R.wood[y < 5 ? 3 : 1])
    b.rect(5, 14, 22, 3, VOID)
  } else {
    b.rect(4, top, 24, 1, R.wood[5])
    b.rect(12, 16, 9, 6, R.straw[3])
    b.rect(12, 16, 9, 1, R.straw[5])
    for (const x of [13, 16, 19]) {
      b.px(x, 18, R.lamp[4])
      b.px(x, 19, R.straw[1])
    }
  }
  b.outline(INK)
  s.stamp(b)
  return s
}

/** Низкий деревянный шкафчик, на нём бутылки зелёного стекла. */
function cabinet() {
  const s = new Sprite(2 * T, T)
  s.shadow(32, 29, 28, 2.5)
  const c = new Sprite(2 * T, T)
  for (let y = 16; y < 29; y++) for (let x = 4; x < 60; x++) c.px(x, y, R.wood[x < 6 ? 4 : x > 57 ? 1 : y < 18 ? 4 : 2])
  c.rect(31, 18, 1, 10, R.wood[1]) // створки
  c.rect(26, 22, 2, 2, R.wood[5])
  c.rect(35, 22, 2, 2, R.wood[5])
  rivets(c, 7, 57, 27, 5)
  c.outline(INK)
  s.stamp(c)
  // бутылки: высокая, круглая и маленькая
  const g = new Sprite(2 * T, T)
  for (const [x, w, h] of [[10, 5, 12], [18, 7, 8], [44, 6, 11], [52, 4, 6]]) {
    for (let y = 16 - h; y < 16; y++) for (let i = 0; i < w; i++) g.px(x + i, y, BOTTLE[i === 0 ? 4 : i === 1 ? 3 : i === w - 1 ? 1 : 2])
    g.rect(x + Math.floor(w / 2) - 1, 16 - h - 3, 2, 3, BOTTLE[1]) // горлышко
  }
  g.outline(INK)
  s.stamp(g)
  return s
}

/** Деревянный верстак с письмом и чашкой давно остывшего чая. */
function deskLetter() {
  const s = new Sprite(2 * T, T)
  s.shadow(32, 29, 28, 2.5)
  const d = new Sprite(2 * T, T)
  for (let y = 12; y < 17; y++) for (let x = 3; x < 61; x++) d.px(x, y, R.wood[y === 12 ? 5 : y > 15 ? 2 : 4])
  for (let y = 17; y < 23; y++) for (let x = 5; x < 59; x++) d.px(x, y, R.wood[x > 56 ? 1 : 2])
  rivets(d, 8, 56, 21, 6)
  for (const x of [6, 55]) for (let y = 23; y < 29; y++) for (let i = 0; i < 3; i++) d.px(x + i, y, R.wood[i === 0 ? 3 : 1])
  d.outline(INK)
  s.stamp(d)
  const l = new Sprite(2 * T, T)
  for (let y = 7; y < 14; y++) for (let x = 14; x < 30; x++) l.px(x, y, x > 26 ? R.bone[1] : R.bone[3])
  for (const y of [9, 11]) for (let x = 16; x < 26; x++) if ((x + y) % 4 !== 0) l.px(x, y, R.bone[0])
  l.shadedEllipse(42, 9, 3.5, 3, R.bone.slice(1))
  l.ellipse(42, 7.5, 2.5, 1, R.wood[1])
  l.px(46, 9, R.bone[2])
  l.outline(INK)
  s.stamp(l)
  return s
}

/** Керосиновая лампа на табурете: тёплое стекло, огонёк — единственный тёплый свет в комнате. */
function lamp() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 9, 2)
  const t = new Sprite(T, T)
  for (let y = 18; y < 21; y++) for (let x = 8; x < 24; x++) t.px(x, y, R.wood[y === 18 ? 4 : 3])
  for (const x of [9, 21]) for (let y = 21; y < 29; y++) t.rect(x, y, 2, 1, R.wood[1])
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

/** Выход в сад: проём в нижней стене, коврик и полоска ночной травы снаружи. */
function doorExit() {
  const s = new Sprite(T, T)
  for (let y = 0; y < T; y++)
    for (let x = 4; x < 28; x++) s.px(x, y, y < 14 ? R.dirt[y < 8 ? 3 : 2] : y > 24 ? (checker(x, y) ? R.grass[2] : R.grass[1]) : VOID)
  // коврик у порога
  for (let y = 4; y < 12; y++) for (let x = 8; x < 24; x++) s.px(x, y, (x + y) % 4 === 0 ? R.rust[2] : R.rust[3])
  s.rect(8, 4, 16, 1, R.rust[4])
  const f = new Sprite(T, T)
  for (let y = 12; y < T; y++) {
    f.rect(1, y, 3, 1, R.wood[y % 6 === 5 ? 1 : 3])
    f.rect(28, y, 3, 1, R.wood[y % 6 === 5 ? 1 : 2])
  }
  f.outline(INK)
  s.stamp(f)
  return s
}

export function interiorFrames() {
  const frames = {}
  for (let m = 0; m < 16; m++) {
    frames[`floor_${m}`] = floor(m)
    frames[`wall_${m}`] = wall(m)
  }
  return {
    ...frames,
    prop_toolbox: toolbox(false),
    prop_toolbox_open: toolbox(true),
    prop_cabinet: cabinet(),
    prop_desk_letter: deskLetter(),
    prop_lamp: lamp(),
    prop_sack: sack(false),
    prop_sack_searched: sack(true),
    prop_door_exit: doorExit(),
  }
}
