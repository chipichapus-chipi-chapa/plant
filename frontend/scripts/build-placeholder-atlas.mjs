// Генератор временных спрайтов «Там, где растёт».
//
// Рисует пиксель-арт процедурно (детерминированный шум, без случайности между запусками)
// и упаковывает всё в атлас: public/assets/atlas.png + atlas.json.
// Настоящие ассеты заменят атлас целиком, если сохранят имена кадров из atlas.json.
//
// Запуск: npm run atlas
// Правила стиля — docs/ART_DIRECTION.md: палитра «выцветшего сада», тёмные (не чёрные) контуры,
// свет сверху-слева, тайлы 32×32.

import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets')
const T = 32

// --- Палитра -----------------------------------------------------------------------------

const P = {
  ink: '#241b13',
  grass: '#a0955a',
  grassShade: '#8f8650',
  grassLight: '#b5ab6e',
  olive: '#616338',
  oliveDark: '#4a4d2a',
  earth: '#4b432c',
  rust: '#724c32',
  rustLight: '#8f5f3c',
  wood: '#8d764b',
  woodDark: '#5e4a30',
  woodLight: '#a68a5a',
  stone: '#8a8a7a',
  stoneDark: '#6b6a5c',
  stoneLight: '#a8a796',
  soil: '#6b4a2f',
  soilDark: '#4f3622',
  soilLight: '#84603d',
  path: '#b39b6b',
  pathShade: '#9c845a',
  roof: '#6e7f86',
  roofDark: '#55636a',
  roofLight: '#8a989c',
  glass: '#3d4a4f',
  berry: '#b5485a',
  bramble: '#3f4a2a',
  // «живая» палитра: посаженные растения ярче выцветшего сада — сад возвращает цвет
  leaf: '#4a8258',
  leafLight: '#86b56e',
  leafPale: '#9fc179',
  leafShadow: '#254c3a',
  outlineGreen: '#1b3831',
  radish: '#c8424e',
  radishLight: '#e0707a',
  petal: '#f2e3c2',
  sun: '#f0c25a',
  sunDark: '#d99a2b',
  bark: '#5e423d',
}

const rgba = (hex, a = 255) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  a,
]

// --- Холст --------------------------------------------------------------------------------

class Sprite {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.data = new Uint8ClampedArray(w * h * 4)
  }

  px(x, y, color, alpha = 255) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const [r, g, b, a] = rgba(color, alpha)
    const i = (y * this.w + x) * 4
    // альфа-композиция «поверх» (Porter–Duff over): полупрозрачная тень на пустом месте
    // остаётся полупрозрачной тенью, а не смешивается с чёрным
    const sa = a / 255
    const da = this.data[i + 3] / 255
    const oa = sa + da * (1 - sa)
    if (oa === 0) return
    for (const [c, v] of [[0, r], [1, g], [2, b]]) {
      this.data[i + c] = (v * sa + this.data[i + c] * da * (1 - sa)) / oa
    }
    this.data[i + 3] = oa * 255
  }

  rect(x, y, w, h, color, alpha) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, color, alpha)
  }

  /** Прямоугольник с контуром: тёмная рамка, тело, светлая кромка сверху-слева. */
  box(x, y, w, h, body, { light, dark, outline = P.ink } = {}) {
    this.rect(x, y, w, h, outline)
    this.rect(x + 1, y + 1, w - 2, h - 2, body)
    if (light) {
      this.rect(x + 1, y + 1, w - 2, 1, light)
      this.rect(x + 1, y + 1, 1, h - 2, light)
    }
    if (dark) {
      this.rect(x + 1, y + h - 2, w - 2, 1, dark)
      this.rect(x + w - 2, y + 1, 1, h - 2, dark)
    }
  }

  ellipse(cx, cy, rx, ry, color, alpha) {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.px(cx + x, cy + y, color, alpha)
  }

  /** Мягкая тень под объектом: тёмно-оливковая, полупрозрачная (ART_DIRECTION). */
  shadow(cx, cy, rx, ry) {
    this.ellipse(cx, cy, rx, ry, P.oliveDark, 90)
  }
}

// Детерминированный шум: одинаковые спрайты при каждом запуске
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

// --- Тайлы ------------------------------------------------------------------------------

function grass(seed) {
  const s = new Sprite(T, T)
  const r = rng(seed)
  s.rect(0, 0, T, T, P.grass)
  for (let i = 0; i < 70; i++) s.px(r() * T, r() * T, P.grassShade)
  for (let i = 0; i < 22; i++) s.px(r() * T, r() * T, P.grassLight)
  // травинки: 1×2..3, светлая верхушка
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(r() * T)
    const y = Math.floor(r() * (T - 3)) + 2
    s.rect(x, y - 2, 1, 3, P.olive)
    s.px(x, y - 2, P.grassLight)
  }
  return s
}

function weedClump(s, x, y, r) {
  const blades = 4 + Math.floor(r() * 3)
  for (let i = 0; i < blades; i++) {
    const dx = Math.floor(r() * 7) - 3
    const height = 4 + Math.floor(r() * 5)
    for (let j = 0; j < height; j++) {
      const lean = Math.round((dx * j) / height / 2)
      s.px(x + dx + lean, y - j, j < 2 ? P.oliveDark : P.olive)
    }
    s.px(x + dx + Math.round(dx / 2), y - height, P.grassLight)
  }
  s.rect(x - 2, y + 1, 5, 1, P.oliveDark, 140)
}

function weeds(seed) {
  const s = grass(seed)
  const r = rng(seed * 7 + 3)
  for (let i = 0; i < 4; i++) weedClump(s, 4 + r() * 24, 8 + r() * 22, r)
  return s
}

function path(seed) {
  const s = new Sprite(T, T)
  const r = rng(seed)
  s.rect(0, 0, T, T, P.path)
  for (let i = 0; i < 60; i++) s.px(r() * T, r() * T, P.pathShade)
  // камешки
  for (let i = 0; i < 4; i++) {
    const x = r() * 28 + 2
    const y = r() * 28 + 2
    s.rect(x, y, 2, 1, P.stoneLight)
    s.rect(x, y + 1, 2, 1, P.stoneDark)
  }
  return s
}

function soil(seed, overgrown = false) {
  const s = new Sprite(T, T)
  const r = rng(seed)
  s.rect(0, 0, T, T, P.soil)
  // борозды: светлый гребень и тёмная ложбина каждые 8 px
  for (let y = 3; y < T; y += 8) {
    for (let x = 0; x < T; x++) {
      s.px(x, y, P.soilLight)
      s.px(x, y + 2, P.soilDark)
    }
  }
  for (let i = 0; i < 30; i++) s.px(r() * T, r() * T, r() > 0.5 ? P.soilDark : P.soilLight)
  // край грядки
  s.rect(0, 0, T, 1, P.earth)
  s.rect(0, T - 1, T, 1, P.soilDark)
  if (overgrown) {
    for (let i = 0; i < 70; i++) s.px(r() * T, r() * T, P.olive)
    for (let i = 0; i < 9; i++) weedClump(s, 3 + r() * 26, 6 + r() * 24, r)
    for (let i = 0; i < 5; i++) s.px(3 + r() * 26, 3 + r() * 26, P.grassLight)
  }
  return s
}

// Забор: штакетник, как на референсе. На тайле — трава и доски поверх.
function fenceHorizontal(seed) {
  const s = grass(seed)
  const r = rng(seed + 11)
  s.shadow(16, 29, 16, 2)
  for (let x = 0; x < T; x += 6) {
    const top = 4 + Math.floor(r() * 4)
    s.rect(x, top, 5, 28 - top, P.ink)
    s.rect(x + 1, top + 1, 3, 26 - top, P.wood)
    s.rect(x + 1, top + 1, 1, 26 - top, P.woodLight)
    s.rect(x + 3, top + 1, 1, 26 - top, P.woodDark)
    if (r() > 0.6) s.px(x + 2, top + 6 + r() * 10, P.rust)
    if (r() > 0.7) s.rect(x + 1, 25, 3, 2, P.olive) // мох у земли
  }
  // поперечина
  s.rect(0, 12, T, 3, P.ink)
  s.rect(0, 13, T, 1, P.woodDark)
  return s
}

function fenceVertical(seed) {
  const s = grass(seed)
  s.shadow(19, 16, 3, 16)
  s.rect(13, 0, 6, T, P.ink)
  s.rect(14, 0, 4, T, P.wood)
  s.rect(14, 0, 1, T, P.woodLight)
  s.rect(17, 0, 1, T, P.woodDark)
  for (let y = 4; y < T; y += 10) s.rect(13, y, 6, 1, P.ink)
  return s
}

function fencePost(seed) {
  const s = grass(seed)
  s.shadow(18, 27, 7, 3)
  s.box(11, 2, 10, 26, P.wood, { light: P.woodLight, dark: P.woodDark })
  s.rect(12, 3, 8, 2, P.woodLight)
  return s
}

function gate(seed) {
  const s = fenceVertical(seed)
  const r = rng(seed + 5)
  // доски калитки поперёк столба
  s.box(8, 6, 16, 20, P.woodDark, { light: P.wood })
  for (let y = 9; y < 24; y += 4) s.rect(9, y, 14, 1, P.ink, 160)
  // ежевика: тёмные плети и ягоды
  for (let i = 0; i < 70; i++) {
    const x = 4 + r() * 24
    const y = 4 + r() * 26
    s.px(x, y, r() > 0.3 ? P.bramble : P.oliveDark)
  }
  for (let i = 0; i < 6; i++) s.rect(6 + r() * 20, 6 + r() * 20, 2, 2, P.berry)
  return s
}

// --- Постройки и предметы ------------------------------------------------------------------

function shed() {
  const W = 4 * T
  const H = 3 * T
  const s = new Sprite(W, H)
  const r = rng(42)
  s.shadow(W / 2 + 6, H - 4, W / 2 - 4, 6)

  // стены: вертикальные рассохшиеся доски
  const wallTop = 38
  s.rect(6, wallTop, W - 12, H - wallTop - 4, P.ink)
  for (let x = 7; x < W - 7; x += 5) {
    s.rect(x, wallTop + 1, 4, H - wallTop - 6, (x / 5) % 2 ? P.woodLight : P.wood)
    s.rect(x + 3, wallTop + 1, 1, H - wallTop - 6, P.woodDark)
    if (r() > 0.6) s.rect(x + 1, wallTop + 6 + r() * 30, 1, 3, P.woodDark)
  }

  // окно с крестовиной
  s.box(18, 54, 22, 18, P.glass, { light: P.roofDark })
  s.rect(28, 55, 2, 16, P.woodDark)
  s.rect(19, 62, 20, 2, P.woodDark)
  s.rect(20, 56, 3, 2, P.roofLight, 140)

  // открытый дверной проём и покосившаяся дверь
  s.rect(70, 52, 26, H - 52 - 4, P.ink)
  s.rect(72, 54, 22, H - 54 - 5, P.earth)
  s.rect(72, 54, 22, 6, P.ink, 120)
  s.box(95, 54, 9, H - 54 - 5, P.wood, { light: P.woodLight, dark: P.woodDark })

  // крыша: ржавый профлист с волнами, нависает над стенами
  const roofBottom = wallTop + 6
  s.rect(0, 6, W, roofBottom - 6, P.ink)
  for (let x = 1; x < W - 1; x++) {
    const wave = x % 4 === 0 ? P.roofDark : x % 4 === 1 ? P.roofLight : P.roof
    s.rect(x, 7, 1, roofBottom - 8, wave)
  }
  // ржавые пятна и дыра
  for (let i = 0; i < 9; i++) {
    const x = r() * (W - 20) + 4
    const y = 9 + r() * 24
    const w = 4 + r() * 10
    const h = 2 + r() * 5
    s.rect(x, y, w, h, P.rust, 210)
    s.rect(x + 1, y, w - 2, 1, P.rustLight, 200)
  }
  s.rect(88, 14, 9, 6, P.ink)
  s.rect(89, 15, 7, 1, P.earth)
  s.rect(0, roofBottom - 2, W, 2, P.ink)
  s.rect(1, 7, W - 2, 1, P.roofLight)

  // труба
  s.box(104, 0, 8, 10, P.stoneDark, { light: P.stone })
  return s
}

function tools() {
  const s = new Sprite(2 * T, T)
  // лопата
  s.rect(9, 2, 3, 20, P.ink)
  s.rect(10, 3, 1, 18, P.woodLight)
  s.box(6, 20, 9, 11, P.stone, { light: P.stoneLight, dark: P.stoneDark })
  s.rect(8, 24, 4, 3, P.rust)
  s.rect(7, 1, 7, 3, P.ink)
  s.rect(8, 2, 5, 1, P.wood)
  // грабли
  s.rect(40, 2, 3, 22, P.ink)
  s.rect(41, 3, 1, 20, P.woodLight)
  s.rect(33, 23, 17, 3, P.ink)
  s.rect(34, 24, 15, 1, P.stoneDark)
  for (let x = 34; x < 50; x += 3) s.rect(x, 26, 1, 4, P.stoneDark)
  // вторая лопата, ржавая
  s.rect(23, 4, 3, 18, P.ink)
  s.rect(24, 5, 1, 16, P.wood)
  s.box(20, 20, 9, 10, P.rust, { light: P.rustLight, dark: P.earth })
  return s
}

function barrel() {
  const s = new Sprite(T, T)
  s.shadow(18, 28, 11, 3)
  s.box(7, 6, 18, 23, P.rust, { light: P.rustLight, dark: P.earth })
  // обручи
  s.rect(7, 11, 18, 2, P.ink)
  s.rect(7, 22, 18, 2, P.ink)
  s.rect(8, 11, 16, 1, P.stoneDark)
  s.rect(8, 22, 16, 1, P.stoneDark)
  // верх
  s.ellipse(16, 6, 8, 3, P.ink)
  s.ellipse(16, 6, 7, 2, P.earth)
  s.rect(12, 6, 6, 1, P.olive) // листья на дне
  return s
}

function wheelbarrow() {
  const s = new Sprite(T, T)
  s.shadow(16, 27, 12, 3)
  // кузов
  s.rect(4, 10, 22, 11, P.ink)
  s.rect(5, 11, 20, 9, P.rust)
  s.rect(5, 11, 20, 2, P.rustLight)
  s.rect(7, 14, 16, 5, P.earth)
  // колесо и ручки
  s.ellipse(9, 23, 4, 4, P.ink)
  s.ellipse(9, 23, 2, 2, P.stoneDark)
  s.rect(24, 12, 7, 2, P.ink)
  s.rect(24, 12, 6, 1, P.wood)
  s.rect(22, 20, 2, 6, P.ink)
  return s
}

function rock() {
  const s = new Sprite(T, T)
  s.shadow(17, 25, 10, 3)
  s.ellipse(13, 20, 7, 5, P.ink)
  s.ellipse(13, 20, 6, 4, P.stone)
  s.ellipse(12, 18, 3, 2, P.stoneLight)
  s.ellipse(22, 22, 4, 3, P.ink)
  s.ellipse(22, 22, 3, 2, P.stoneDark)
  s.px(21, 21, P.stone)
  s.rect(16, 25, 3, 1, P.olive) // мох
  return s
}


// --- Растения ---------------------------------------------------------------------------
// Кадр 32×48: низ совпадает с низом клетки, верх может выступать на полклетки выше.

const PW = T
const PH = 48
const GROUND = PH - 6 // уровень земли внутри кадра

function plantCanvas() {
  const s = new Sprite(PW, PH)
  // свежевскопанная лунка
  s.ellipse(16, GROUND + 1, 7, 2, P.soilDark)
  s.ellipse(15, GROUND, 5, 1, P.soilLight)
  return s
}

/** Лист: овал с тёмным контуром и светлой серединкой. */
function leaf(s, cx, cy, rx, ry, light = P.leafLight) {
  s.ellipse(cx, cy, rx + 1, ry + 1, P.outlineGreen)
  s.ellipse(cx, cy, rx, ry, P.leaf)
  s.ellipse(cx, cy - 1, Math.max(1, rx - 1), Math.max(0, ry - 1), light)
}

function stem(s, x, top, bottom) {
  s.rect(x - 1, top, 3, bottom - top, P.outlineGreen)
  s.rect(x, top, 1, bottom - top, P.leaf)
}

function sprout() {
  const s = plantCanvas()
  stem(s, 16, GROUND - 6, GROUND)
  leaf(s, 13, GROUND - 7, 2, 1)
  leaf(s, 19, GROUND - 8, 2, 1, P.leafPale)
  return s
}

function radish(stage) {
  if (stage === 0) return sprout()
  const s = plantCanvas()
  const big = stage === 2
  if (big) {
    // красная макушка корнеплода выглядывает из земли
    s.ellipse(16, GROUND - 1, 5, 3, P.outlineGreen)
    s.ellipse(16, GROUND - 1, 4, 2, P.radish)
    s.rect(14, GROUND - 2, 2, 1, P.radishLight)
  }
  const h = big ? 14 : 9
  leaf(s, 11, GROUND - h, 3, big ? 5 : 3)
  leaf(s, 21, GROUND - h, 3, big ? 5 : 3)
  leaf(s, 16, GROUND - h - 3, 2, big ? 6 : 4, P.leafPale)
  return s
}

function chamomile(stage) {
  if (stage === 0) return sprout()
  const s = plantCanvas()
  // кустик из тонких листьев
  for (const [x, y] of [[11, 10], [21, 10], [14, 14], [18, 14], [16, 8]]) {
    stem(s, x, GROUND - y, GROUND)
    leaf(s, x, GROUND - y, 1, 2)
  }
  if (stage === 2) {
    for (const [x, y] of [[10, 18], [16, 22], [22, 17], [13, 13], [20, 12]]) {
      stem(s, x, GROUND - y, GROUND - y + 6)
      // ромашка: белые лепестки крестом, жёлтая серединка
      s.rect(x - 2, GROUND - y - 1, 5, 3, P.outlineGreen)
      s.rect(x - 1, GROUND - y - 2, 3, 5, P.outlineGreen)
      s.rect(x - 1, GROUND - y, 3, 1, P.petal)
      s.rect(x, GROUND - y - 1, 1, 3, P.petal)
      s.px(x, GROUND - y, P.sun)
    }
  }
  return s
}

function sunflower(stage) {
  if (stage === 0) return sprout()
  const s = plantCanvas()
  const height = [0, 12, 24, 34][stage]
  stem(s, 16, GROUND - height, GROUND)
  leaf(s, 11, GROUND - Math.round(height * 0.35), 4, 2)
  leaf(s, 21, GROUND - Math.round(height * 0.55), 4, 2, P.leafPale)
  if (stage >= 2) leaf(s, 11, GROUND - Math.round(height * 0.75), 3, 2)
  const top = GROUND - height
  if (stage === 2) {
    // зелёный бутон
    s.ellipse(16, top, 3, 3, P.outlineGreen)
    s.ellipse(16, top, 2, 2, P.leafLight)
  }
  if (stage === 3) {
    // цветок: жёлтые лепестки, тёмная серединка с семечками
    s.ellipse(16, top, 8, 7, P.outlineGreen)
    s.ellipse(16, top, 7, 6, P.sun)
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2
      s.px(16 + Math.round(Math.cos(ang) * 6), top + Math.round(Math.sin(ang) * 5), P.sunDark)
    }
    s.ellipse(16, top, 3, 3, P.bark)
    s.px(15, top - 1, P.soilLight)
    s.px(17, top + 1, P.soilLight)
  }
  return s
}


// Каменная чаша — магический объект. Спит: сухой мох, трещина. Пробуждена: светящиеся цветы.
function basin(awakened) {
  const s = new Sprite(T, T)
  const r = rng(awakened ? 811 : 810)
  if (awakened) {
    // мягкое свечение вокруг
    s.ellipse(16, 18, 15, 12, P.leafPale, 50)
    s.ellipse(16, 18, 12, 9, P.petal, 50)
  }
  s.shadow(18, 28, 11, 3)
  // ножка и чаша
  s.box(12, 20, 9, 8, P.stoneDark, { light: P.stone })
  s.ellipse(16, 15, 12, 7, P.ink)
  s.ellipse(16, 15, 11, 6, P.stone)
  s.ellipse(16, 14, 9, 4, awakened ? P.leafShadow : P.earth)
  // знаки-листья по краю
  for (const x of [8, 16, 24]) s.px(x, 19, P.stoneLight)
  s.px(12, 20, P.stoneLight)
  s.px(20, 20, P.stoneLight)
  if (!awakened) {
    for (let i = 0; i < 18; i++) s.px(9 + r() * 14, 12 + r() * 4, r() > 0.5 ? P.olive : P.grassShade)
    s.rect(19, 16, 1, 4, P.ink) // трещина
    s.px(20, 18, P.ink)
    return s
  }
  // пробуждённые цветы: изумрудные листья и аметистовые светящиеся бутоны
  for (const [x, y] of [[10, 12], [22, 12], [16, 9]]) leaf(s, x, y, 2, 2)
  for (const [x, y, c] of [[12, 8, '#b48ad6'], [20, 7, '#b48ad6'], [16, 4, '#d9c2ef'], [8, 10, '#9b6fc4'], [24, 10, '#9b6fc4']]) {
    s.rect(x - 1, y - 1, 3, 3, P.outlineGreen)
    s.px(x, y, c)
    s.px(x - 1, y, c, 160)
    s.px(x + 1, y, c, 160)
    s.px(x, y - 1, '#f2e3c2', 200)
  }
  return s
}

// --- Сборка атласа ------------------------------------------------------------------------

const frames = {
  ...Object.fromEntries([0, 1, 2, 3].map((i) => [`grass_${i}`, grass(100 + i)])),
  ...Object.fromEntries([0, 1, 2].map((i) => [`weeds_${i}`, weeds(200 + i)])),
  ...Object.fromEntries([0, 1].map((i) => [`path_${i}`, path(300 + i)])),
  ...Object.fromEntries([0, 1].map((i) => [`soil_${i}`, soil(400 + i)])),
  ...Object.fromEntries([0, 1].map((i) => [`overgrown_${i}`, soil(500 + i, true)])),
  fence_h: fenceHorizontal(600),
  fence_v: fenceVertical(601),
  fence_post: fencePost(602),
  gate: gate(700),
  prop_shed: shed(),
  prop_tools: tools(),
  prop_barrel: barrel(),
  prop_wheelbarrow: wheelbarrow(),
  prop_rock: rock(),
  prop_basin: basin(false),
  prop_basin_awakened: basin(true),
  ...Object.fromEntries([0, 1, 2].map((i) => [`plant_radish_${i}`, radish(i)])),
  ...Object.fromEntries([0, 1, 2].map((i) => [`plant_chamomile_${i}`, chamomile(i)])),
  ...Object.fromEntries([0, 1, 2, 3].map((i) => [`plant_sunflower_${i}`, sunflower(i)])),
}

// Упаковка «полками»: кадры по высоте, слева направо
const ATLAS_W = 512
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

// --- PNG без зависимостей ------------------------------------------------------------------

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePng(width, height, rgbaData) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // бит на канал
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // фильтр None
    Buffer.from(rgbaData.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'atlas.png'), encodePng(ATLAS_W, ATLAS_H, atlas))
writeFileSync(
  join(OUT_DIR, 'atlas.json'),
  JSON.stringify({ image: 'atlas.png', tileSize: T, frames: Object.fromEntries(Object.keys(frames).map((k) => [k, placed[k]])) }, null, 2) + '\n',
)
console.log(`atlas: ${ATLAS_W}×${ATLAS_H}, кадров: ${Object.keys(frames).length} → ${OUT_DIR}`)
