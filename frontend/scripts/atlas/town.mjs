// Городок у мельницы (глава 2): домик Агаты, мельница, цветочный прилавок, доска объявлений.
// Тон приглушённый, как у поместья («не так ярко»); окна светятся тем же тёплым светом лампы.

import { checker, noise, pick, rng, Sprite } from './canvas.mjs'
import { T } from './tiles.mjs'
import { INK, R } from './palette.mjs'

const ROOF = ['#22303a', '#2f414c', '#3e5460', '#516975', '#668089'] // сине-серая черепица: другой берег
const PLASTER = ['#6d6559', '#8f8574', '#a99e89', '#c0b49c']
const STRIPE = ['#7a2a38', '#a34452', '#c8b89a', '#e6dcc4']

/** Окно с тёплым светом и переплётом. */
function lit(s, x, y, w, h) {
  s.rect(x - 2, y - 2, w + 4, h + 4, R.wood[1])
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.px(x + i, y + j, pick(R.lamp.slice(2, 5), 1 - Math.abs(i - w / 2) / w - j / (h * 3), x + i, y + j))
  s.rect(x + Math.floor(w / 2) - 1, y, 2, h, R.wood[1])
  s.rect(x, y + Math.floor(h / 2) - 1, w, 2, R.wood[1])
}

/** Домик Агаты 4×3: тесный, тёплый, на подоконнике светится последняя лилия. */
function cottage() {
  const W = 4 * T
  const H = 3 * T
  const s = new Sprite(W, H)
  const b = new Sprite(W, H)
  const wallTop = 46
  const wallBottom = H - 5
  for (let y = wallTop; y < wallBottom; y++)
    for (let x = 8; x < W - 8; x++) b.px(x, y, x < 11 ? PLASTER[3] : x > W - 12 ? PLASTER[1] : noise(x, y, 6, 9, 1e9) > 0.82 && checker(x, y) ? PLASTER[1] : PLASTER[2])
  for (const x of [8, 62, W - 12]) b.rect(x, wallTop, 4, wallBottom - wallTop, R.wood[2])
  for (let x = 6; x < W - 6; x += 7) b.shadedEllipse(x + 3, wallBottom + 1, 4, 3, R.stone.slice(2))
  lit(b, 20, 58, 22, 16)
  // на подоконнике — горшок с последней лилией, светится розовым
  b.rect(27, 74, 8, 5, R.rust[3])
  b.rect(30, 68, 2, 6, R.leaf[3])
  b.shadedEllipse(31, 66, 3, 2, ['#8e5568', '#c98aa8', '#e8c0d0'])
  // дверь
  b.rect(74, 56, 26, wallBottom - 56, R.wood[1])
  for (let y = 58; y < wallBottom; y++) for (let x = 76; x < 98; x++) b.px(x, y, (x - 76) % 7 === 6 ? R.wood[2] : R.wood[4])
  b.rect(94, 72, 2, 2, R.straw[5])
  b.rect(102, 58, 5, 7, R.silver[1])
  b.rect(103, 59, 3, 5, R.lamp[4])
  // крыша-шатёр
  for (let y = 4; y < wallTop + 3; y++) {
    const inset = Math.max(0, Math.round((wallTop - y) * 0.15))
    for (let x = inset; x < W - inset; x++) {
      const row = Math.floor(y / 5)
      const cx = (x + (row % 2) * 3) % 6
      b.px(x, y, (y % 5) === 4 ? ROOF[1] : cx < 2 ? ROOF[4] : ROOF[3])
    }
  }
  for (let x = 6; x < W - 6; x++) b.px(x, 4, ROOF[4])
  // труба и дымок
  for (let y = 0; y < 14; y++) for (let x = 98; x < 108; x++) b.px(x, y, R.rust[x === 98 ? 4 : x === 107 ? 1 : 3])
  b.outline(INK)
  s.shadow(W / 2, H - 2, W / 2 - 6, 4)
  s.stamp(b)
  return s
}

/** Мельница 3×4: каменная башня, деревянная шапка, четыре крыла. */
function windmill() {
  const W = 3 * T
  const H = 4 * T
  const s = new Sprite(W, H)
  const tower = new Sprite(W, H)
  for (let y = 40; y < H - 4; y++) {
    const half = 18 + (y - 40) * 0.12
    for (let x = Math.round(48 - half); x <= Math.round(48 + half); x++) {
      const t = (x - (48 - half)) / (2 * half)
      const brick = (Math.floor(y / 5) + Math.floor((x + (Math.floor(y / 5) % 2) * 3) / 7)) % 2
      tower.px(x, y, pick(R.stone.slice(2, 6), 1 - t - (brick ? 0.12 : 0), x, y))
    }
  }
  // дверь и окошко
  tower.rect(41, H - 26, 14, 22, R.wood[1])
  for (let y = H - 24; y < H - 4; y++) for (let x = 43; x < 53; x++) tower.px(x, y, (x - 43) % 5 === 4 ? R.wood[2] : R.wood[3])
  lit(tower, 45, 58, 6, 8)
  // шапка
  for (let y = 26; y < 42; y++) {
    const half = 8 + (y - 26) * 0.9
    for (let x = Math.round(48 - half); x <= Math.round(48 + half); x++) tower.px(x, y, x < 48 ? R.wood[3] : R.wood[2])
  }
  tower.outline(INK)
  // крылья — косой крест из решёток
  const sails = new Sprite(W, H)
  const hub = [48, 34]
  for (const [dx, dy] of [[1, -1], [-1, 1], [1, 1], [-1, -1]]) {
    for (let t = 4; t < 27; t++) {
      const x = hub[0] + dx * t
      const y = hub[1] + dy * t * 0.95
      sails.px(x, y, R.wood[4])
      if (t > 8) for (let k = 1; k < 6; k++) sails.px(x - dy * k * 0.7, y + dx * k * 0.7, (t + k) % 4 === 0 ? R.wood[1] : R.cream[3])
    }
  }
  sails.shadedEllipse(hub[0], hub[1], 3, 3, R.wood.slice(1, 5))
  sails.outline(INK)
  s.shadow(48, H - 3, 24, 4)
  s.stamp(tower)
  s.stamp(sails)
  return s
}

/** Цветочный прилавок Лизы 2×2: полосатый навес, горшки — пустые и один упрямый ирис. */
function flowerStall() {
  const W = 2 * T
  const H = 2 * T
  const s = new Sprite(W, H)
  const b = new Sprite(W, H)
  // навес
  for (let y = 4; y < 16; y++) for (let x = 2; x < W - 2; x++) b.px(x, y, Math.floor((x - 2) / 6) % 2 ? STRIPE[3] : STRIPE[1])
  for (let x = 2; x < W - 2; x += 6) for (let k = 0; k < 6; k++) b.px(x + k, 16 + (k > 1 && k < 4 ? 1 : 0), Math.floor((x - 2) / 6) % 2 ? STRIPE[2] : STRIPE[0])
  // стойки и прилавок
  b.rect(4, 16, 3, 40, R.wood[2])
  b.rect(W - 7, 16, 3, 40, R.wood[2])
  b.rect(2, 40, W - 4, 6, R.wood[4])
  b.rect(2, 46, W - 4, 12, R.wood[2])
  for (let x = 4; x < W - 4; x += 5) b.rect(x, 47, 1, 10, R.wood[1])
  // горшки
  for (const x of [10, 22, 34, 46]) {
    b.rect(x, 34, 8, 6, R.rust[3])
    b.rect(x, 34, 8, 1, R.rust[4])
  }
  // упрямый ирис
  b.rect(37, 24, 1, 10, R.leaf[3])
  b.line(37, 33, 35, 27, R.leaf[2])
  b.shadedEllipse(38, 23, 2.5, 2, ['#3b2f5e', '#5a4a8c', '#7d6cb4', '#a597d4'])
  b.outline(INK)
  s.shadow(W / 2, H - 4, W / 2 - 4, 3)
  s.stamp(b)
  return s
}

const AWNING = {
  flowers: ['#7a2a38', '#c8708a', '#e6dcc4'],
  veg: ['#2f4c2e', '#5f8a4a', '#e6dcc4'],
  moon: ['#22303a', '#4a6a9a', '#e6dcc4'],
}

/** Ярмарочный прилавок 1×1: полосатый навес и стойка; полный — с урожаем (и фонариком у вечернего). */
function fairStall(kind, full) {
  const s = new Sprite(T, T)
  const b = new Sprite(T, T)
  const [dark, mid, light] = AWNING[kind]
  for (let y = 3; y < 10; y++) for (let x = 2; x < T - 2; x++) b.px(x, y, Math.floor((x - 2) / 4) % 2 ? light : mid)
  for (let x = 2; x < T - 2; x += 4) b.rect(x + 1, 10, 2, 1, Math.floor((x - 2) / 4) % 2 ? light : dark)
  b.rect(4, 10, 2, 20, R.wood[2])
  b.rect(T - 6, 10, 2, 20, R.wood[2])
  b.rect(3, 20, T - 6, 3, R.wood[4])
  b.rect(3, 23, T - 6, 6, R.wood[2])
  for (let x = 5; x < T - 4; x += 4) b.rect(x, 24, 1, 5, R.wood[1])
  if (full) {
    const r = rng(kind.length * 7)
    if (kind === 'flowers') {
      for (const [x, c] of [[9, R.berry[4]], [15, '#7d6cb4'], [21, R.bone[3]]]) {
        b.rect(x, 15, 1, 5, R.leaf[3])
        b.shadedEllipse(x, 14, 2.5, 2, [c, c, R.bone[3]])
      }
    } else if (kind === 'veg') {
      for (let i = 0; i < 5; i++) b.shadedEllipse(8 + i * 3, 18, 1.8, 1.6, [R.berry[2], R.berry[3], R.berry[4]])
      b.rect(19, 15, 7, 5, R.straw[3])
      for (let i = 0; i < 6; i++) b.px(20 + Math.floor(r() * 5), 15 + Math.floor(r() * 3), R.soil[3])
    } else {
      b.rect(8, 15, 3, 5, R.bone[2]) // чайник
      b.rect(7, 17, 1, 2, R.bone[1])
      b.shadedEllipse(16, 17, 2.5, 2, ['#e7a3b8', '#f0c2cf', '#fbe6ec']) // лилия
      b.rect(23, 11, 1, 3, R.wood[1]) // фонарик-цветок на крючке
      b.shadedEllipse(23, 15, 2.5, 2.5, ['#4f6f93', '#8fb5d6', '#c9e2f2', '#f0f8ff'])
    }
  }
  b.outline(INK)
  s.shadow(16, 30, 12, 1.5)
  s.stamp(b)
  return s
}

/** Доска объявлений 1×1: записки на кнопках. */
function noticeBoard() {
  const s = new Sprite(T, T)
  const b = new Sprite(T, T)
  b.rect(6, 4, 20, 16, R.wood[3])
  b.rect(6, 4, 20, 1, R.wood[5])
  b.rect(9, 20, 2, 10, R.wood[2])
  b.rect(21, 20, 2, 10, R.wood[2])
  const r = rng(11)
  for (const [x, y, w, h] of [[8, 6, 6, 6], [15, 7, 8, 5], [9, 13, 5, 5], [16, 13, 7, 5]]) {
    b.rect(x, y, w, h, r() > 0.5 ? R.bone[3] : R.bone[2])
    for (let j = 1; j < h - 1; j += 2) b.rect(x + 1, y + j, w - 2, 1, R.bone[0])
    b.px(x + Math.floor(w / 2), y, R.berry[3])
  }
  b.outline(INK)
  s.shadow(16, 30, 9, 1.5)
  s.stamp(b)
  return s
}

export function townFrames() {
  return {
    prop_cottage: cottage(),
    prop_windmill: windmill(),
    prop_flower_stall: flowerStall(),
    prop_notice_board: noticeBoard(),
    ...Object.fromEntries(['flowers', 'veg', 'moon'].flatMap((k) => [[`prop_fair_${k}`, fairStall(k, false)], [`prop_fair_${k}_awakened`, fairStall(k, true)]])),
  }
}
