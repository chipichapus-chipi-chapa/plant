// Ракушечный остров (глава 5): песок с ракушками, мостки с лодкой, белый маяк с шестью цветными окнами
// и смотрительница — старая черепаха Кора в круглых очках.

import { noise, rng, Sprite } from './canvas.mjs'
import { T } from './tiles.mjs'
import { INK, R } from './palette.mjs'

const SAND = ['#3a3026', '#574833', '#76623f', '#8f784c', '#a68e5c']
const STONE = ['#3e4046', '#5e6068', '#80828a', '#a8a6a0', '#c4c2ba']
const SHELL = ['#c88a7a', '#e2b2a2', '#f4dccf']
const TURTLE = ['#2a3a24', '#3f5a32', '#5a7a44', '#7e9a5c']
const SKIN = ['#4e5a3a', '#6e7c50', '#909e6c']

/** Песок с рябью от ветра и ракушками; seed — свой узор у каждой клетки. */
function sand(seed) {
  const s = new Sprite(T, T)
  const r = rng(300 + seed)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const ripple = (y + Math.round(Math.sin((x + seed * 7) / 5) * 2)) % 7 === 0
      const n = noise(x, y, 4, 310 + seed, T)
      s.px(x, y, ripple ? SAND[2] : n > 0.7 ? SAND[4] : SAND[3])
    }
  for (let i = 0; i < 2; i++) {
    const x = 4 + Math.floor(r() * 24)
    const y = 4 + Math.floor(r() * 24)
    s.px(x, y, SHELL[1])
    s.px(x + 1, y, SHELL[2])
    s.px(x, y + 1, SHELL[0])
  }
  return s
}

/** Мостки 1×1: доски над водой и лодка у края. */
function pier() {
  const s = new Sprite(T, T)
  const b = new Sprite(T, T)
  b.rect(4, 6, 24, 14, R.wood[3])
  for (let x = 4; x < 28; x += 6) b.rect(x, 6, 1, 14, R.wood[1])
  b.rect(6, 20, 2, 8, R.wood[1])
  b.rect(24, 20, 2, 8, R.wood[1])
  b.shadedEllipse(14, 26, 11, 4, [R.wood[1], R.wood[2], R.wood[4]]) // лодка
  b.rect(8, 25, 12, 1, R.wood[5])
  b.outline(INK)
  s.stamp(b)
  return s
}

/** Где на маяке окна (по кристаллам, снизу вверх зигзагом) — эти же точки знает клиент. */
export const LIGHTHOUSE_WINDOWS = [[24, 106], [40, 92], [24, 78], [40, 64], [24, 50], [40, 36]]

/** Маяк 2×4: белая башня, шесть тёмных окон, фонарная комната наверху; lit — фонарь горит. */
function lighthouse(lit) {
  const W = 2 * T
  const H = 4 * T
  const s = new Sprite(W, H)
  const b = new Sprite(W, H)
  for (let y = 26; y < H - 6; y++) {
    const half = 12 + Math.floor((y - 26) / 12)
    for (let x = 32 - half; x < 32 + half; x++) {
      const shade = x < 32 - half + 3 ? 1 : x > 32 + half - 5 ? 2 : 3
      b.px(x, y, shade === 3 && y % 20 < 8 ? R.berry[2] : STONE[shade])
    }
  }
  b.rect(16, H - 8, 32, 4, STONE[1]) // основание
  b.rect(26, H - 22, 12, 16, R.wood[2]) // дверь
  b.rect(26, H - 22, 12, 2, R.wood[4])
  b.rect(18, 22, 28, 4, STONE[1]) // галерея
  for (let x = 19; x < 46; x += 4) b.rect(x, 16, 1, 6, INK)
  b.rect(22, 8, 20, 14, lit ? R.lamp[4] : '#2a2c36') // фонарная комната
  if (lit) b.rect(28, 11, 8, 8, R.lamp[5])
  for (let y = 0; y < 8; y++) b.rect(24 + y, 8 - y, 16 - y * 2, 1, R.berry[2]) // крыша
  b.outline(INK)
  for (const [x, y] of LIGHTHOUSE_WINDOWS) {
    b.rect(x - 3, y - 4, 6, 8, R.wood[1])
    b.rect(x - 2, y - 3, 4, 6, '#1a1c26')
  }
  s.shadow(32, H - 4, 18, 3)
  s.stamp(b)
  return s
}

/** Черепаха Кора 32×48: высокий панцирь с картой озера, голова в круглых очках; frame 1 — кивает. */
function turtle(frame) {
  const s = new Sprite(32, 48)
  s.shadow(16, 46, 12, 1.5)
  const c = new Sprite(32, 48)
  for (const x of [8, 24]) c.shadedEllipse(x, 44, 3, 2, SKIN)
  c.shadedEllipse(15, 38, 11, 8, TURTLE, { bias: 0.1 })
  c.shadedEllipse(27, 34 + frame, 4, 3.5, SKIN, { bias: 0.1 })
  c.outline(INK)
  s.stamp(c)
  const r = rng(77)
  for (let i = 0; i < 6; i++) s.px(9 + Math.floor(r() * 12), 34 + Math.floor(r() * 7), TURTLE[3]) // карта на панцире
  s.line(9, 38, 20, 36, SAND[3])
  for (const x of [26, 29]) {
    s.rect(x - 1, 32 + frame, 3, 3, '#d8d0b8')
    s.px(x, 33 + frame, INK)
  }
  s.px(28, 33 + frame, '#d8d0b8')
  return s
}

/** Костерок 1×1: кольцо камней, поленья, огонь и чайник на треноге. */
function campfire() {
  const s = new Sprite(T, T)
  const b = new Sprite(T, T)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    b.shadedEllipse(16 + Math.cos(a) * 9, 24 + Math.sin(a) * 4, 2.5, 2, [STONE[0], STONE[1], STONE[2]])
  }
  b.line(9, 25, 22, 22, R.wood[2])
  b.line(10, 22, 23, 25, R.wood[3])
  b.shadedEllipse(16, 20, 4, 5, [R.lamp[1], R.lamp[2], R.lamp[3], R.lamp[4]])
  b.shadedEllipse(16, 21, 2, 3, [R.lamp[3], R.lamp[4], R.lamp[5]])
  b.line(8, 22, 16, 4, R.wood[1]) // тренога
  b.line(24, 22, 16, 4, R.wood[1])
  b.shadedEllipse(16, 10, 4, 3.5, [STONE[1], STONE[2], STONE[3]]) // чайник
  b.rect(19, 9, 3, 1, STONE[2])
  b.outline(INK)
  s.stamp(b)
  return s
}

/** Домик Коры 2×2: брёвна, крыша из ракушек, круглое окошко с тёплым светом. */
function hut() {
  const W = 2 * T
  const H = 2 * T
  const s = new Sprite(W, H)
  const b = new Sprite(W, H)
  b.rect(8, 28, 48, 32, R.wood[3])
  for (let y = 30; y < 60; y += 5) b.rect(8, y, 48, 1, R.wood[2])
  for (let y = 6; y < 30; y++) {
    const half = Math.min(30, 4 + (y - 6) * 1.2)
    for (let x = 32 - half; x < 32 + half; x++) b.px(x, y, (x + y) % 5 ? SHELL[0] : SHELL[1])
  }
  const r = rng(91)
  for (let i = 0; i < 10; i++) b.px(10 + Math.floor(r() * 44), 14 + Math.floor(r() * 14), SHELL[2])
  b.shadedEllipse(20, 42, 6, 6, [R.lamp[2], R.lamp[3], R.lamp[4], R.lamp[5]]) // окошко
  b.rect(19, 36, 2, 12, R.wood[1])
  b.rect(14, 41, 12, 2, R.wood[1])
  b.rect(36, 38, 12, 22, R.wood[1]) // дверь
  b.px(45, 49, R.lamp[4])
  b.outline(INK)
  s.shadow(W / 2, H - 3, 26, 2.5)
  s.stamp(b)
  return s
}

/**
 * Теплица-домик над одной грядкой, 32×48 (низ — у низа клетки): деревянная рама, стеклянные стены и
 * двускатная стеклянная крыша, дверца с ручкой, снег на коньке. Стекло полупрозрачное — сквозь него видно растение.
 */
function greenhouse() {
  const s = new Sprite(32, 48)
  const GLASS = '#bfe3ec'
  const FRAME = [R.wood[1], R.wood[3], R.wood[4]]
  // стены и дверца
  s.rect(3, 24, 26, 19, GLASS, 80)
  s.rect(4, 25, 8, 8, '#e6f6fa', 60) // светлое стекло с бликом слева
  for (let k = 0; k < 6; k++) s.px(5 + k, 31 - k, '#ffffff', 150)
  for (let k = 0; k < 4; k++) s.px(22 + k, 30 - k, '#ffffff', 120)
  // двускатная крыша: стекло между стропилами
  for (let y = 8; y < 24; y++) {
    const half = Math.round((y - 8) * 0.95) + 1
    for (let x = 16 - half; x < 16 + half; x++) s.px(x, y, GLASS, 110)
  }
  for (let y = 8; y < 24; y++) {
    const half = Math.round((y - 8) * 0.95) + 1
    s.px(16 - half, y, FRAME[1])
    s.px(16 + half - 1, y, FRAME[1])
    s.px(16 - half - 1, y, INK)
    s.px(16 + half, y, INK)
  }
  s.rect(15, 8, 2, 16, FRAME[1]) // конёк и стропило
  s.rect(1, 23, 30, 2, FRAME[2]) // карниз
  s.rect(1, 25, 30, 1, INK)
  // рама стен
  for (const x of [3, 28]) s.rect(x, 24, 1, 19, FRAME[1])
  s.rect(3, 33, 26, 1, FRAME[1])
  // дверца
  s.rect(12, 30, 8, 13, FRAME[0])
  s.rect(13, 31, 6, 11, GLASS, 90)
  s.rect(13, 36, 6, 1, FRAME[0])
  s.px(18, 37, R.lamp[4])
  // нижний брус и тень
  s.rect(2, 42, 28, 3, FRAME[2])
  s.rect(2, 45, 28, 1, INK)
  s.rect(2, 42, 1, 3, INK)
  s.rect(29, 42, 1, 3, INK)
  // снег на коньке и карнизе
  for (let x = 13; x < 19; x++) s.px(x, 7 + (x % 2), '#f2f6fb')
  for (let x = 2; x < 30; x += 2) s.px(x, 22, '#f2f6fb')
  return s
}

export function islandFrames() {
  return {
    sand_0: sand(0),
    sand_1: sand(1),
    sand_2: sand(2),
    prop_pier: pier(),
    prop_greenhouse: greenhouse(),
    prop_campfire: campfire(),
    prop_island_hut: hut(),
    prop_lighthouse: lighthouse(false),
    prop_lighthouse_awakened: lighthouse(true),
    npc_turtle_0: turtle(0),
    npc_turtle_1: turtle(1),
  }
}
