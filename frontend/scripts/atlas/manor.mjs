// Поместье за чащей — самое уютное место игры. Дом с тёплым светом в окнах и ящиками цветов,
// вьющейся розой и дымком из трубы; вокруг — сад с исполинскими розовыми лилиями, старым дубом с качелями
// и цветущей вишней. Внутри — кухня: печь с чайником, полка с вареньем, часы с кукушкой, книжный шкаф,
// кресло, шкатулка, лоскутный ковёр. Тот же приём: плоские тона, шахматка, почти чёрный контур.

import { checker, noise, pick, rng, Sprite } from './canvas.mjs'
import { T } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

const N = 1
const E = 2
const S = 4
const W = 8

// пыльная роза: розовый, но приглушённый — в сумерках он светится, а не кричит
const PINK = ['#4a2434', '#6b3a4e', '#8e5568', '#ad7484', '#c7979f', '#dcbcbe']
const ROOF = ['#361d1b', '#4f2d28', '#683d33', '#80523f', '#966650']
const PLASTER = ['#7d6d5c', '#a08f78', '#bba98e', '#cdbd9f']
const BOTTLE = ['#1f3a1c', '#2f5a26', '#4f8a3a', '#7ab84a', '#b6e07a']

// --- Дом ------------------------------------------------------------------------------------

/** Тёплое окно: свет лампы за переплётом, занавески по бокам, ящик с цветами под окном. */
function cozyWindow(s, x, y, w, h, r) {
  s.rect(x - 2, y - 2, w + 4, h + 4, R.wood[1])
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.px(x + i, y + j, pick(R.lamp.slice(2, 5), 1 - Math.abs(i - w / 2) / w - j / (h * 3), x + i, y + j))
  s.rect(x + Math.floor(w / 2) - 1, y, 2, h, R.wood[1])
  s.rect(x, y + Math.floor(h / 2) - 1, w, 2, R.wood[1])
  for (let j = 0; j < h; j++) {
    s.rect(x, y + j, j < h - 4 ? 3 : 2, 1, PINK[j % 3 === 0 ? 2 : 3]) // занавески
    s.rect(x + w - 3, y + j, j < h - 4 ? 3 : 2, 1, PINK[j % 3 === 0 ? 1 : 2])
  }
  // ящик с цветами
  s.rect(x - 4, y + h + 2, w + 8, 5, R.wood[3])
  s.rect(x - 4, y + h + 2, w + 8, 1, R.wood[5])
  for (let i = 0; i < w + 6; i += 2) {
    s.px(x - 3 + i, y + h + 1, R.leaf[3])
    if (r() > 0.4) s.px(x - 3 + i, y + h, r() > 0.5 ? PINK[4] : R.bone[3])
  }
}

/** Дом 6×3 клетки. */
function manor() {
  const W = 6 * T
  const H = 3 * T
  const s = new Sprite(W, H)
  const r = rng(77)
  const b = new Sprite(W, H)
  const wallTop = 42
  const wallBottom = H - 5
  // стены: тёплая штукатурка, мягкие балки
  for (let y = wallTop; y < wallBottom; y++)
    for (let x = 6; x < W - 6; x++) b.px(x, y, x < 9 ? PLASTER[3] : x > W - 10 ? PLASTER[1] : noise(x, y, 7, 4, 1e9) > 0.8 && checker(x, y) ? PLASTER[1] : PLASTER[2])
  for (const x of [6, 62, 128, W - 10]) b.rect(x, wallTop, 4, wallBottom - wallTop, R.wood[2])
  b.rect(6, wallTop, W - 12, 3, R.wood[3])
  // каменный цоколь
  for (let x = 4; x < W - 4; x += 7) b.shadedEllipse(x + 3, wallBottom + 1, 4, 3, R.stone.slice(2))
  // окна с тёплым светом
  cozyWindow(b, 20, 54, 26, 18, r)
  cozyWindow(b, 146, 54, 26, 18, r)
  // дверь: арка, круглое окошко, ручка; фонарик рядом
  b.rect(94, 50, 36, wallBottom - 50, R.wood[1])
  for (let y = 50; y < wallBottom; y++)
    for (let x = 96; x < 128; x++) {
      const arch = y < 58 && ((x - 112) / 16) ** 2 + ((y - 58) / 8) ** 2 > 1
      if (!arch) b.px(x, y, (x - 96) % 8 === 7 ? R.wood[2] : R.wood[4])
    }
  b.shadedEllipse(112, 62, 4, 4, R.lamp.slice(2)) // окошко в двери
  b.rect(122, 72, 2, 2, R.straw[5])
  b.rect(134, 54, 6, 8, R.silver[1]) // фонарик у двери
  b.rect(135, 55, 4, 6, R.lamp[4])
  b.rect(136, 52, 2, 2, R.silver[2])
  // вьющаяся роза у двери
  for (let y = 46; y < wallBottom; y++) {
    const x = 86 + Math.round(Math.sin(y / 4) * 3)
    b.px(x, y, R.leaf[2])
    if (y % 5 === 0) {
      b.px(x + 1, y, R.leaf[4])
      b.rect(x - 1, y - 1, 2, 2, PINK[3])
    }
  }
  // крыша: черепица полукругами, мох, конёк
  for (let y = 6; y < wallTop + 3; y++) {
    const inset = Math.max(0, 16 - y)
    for (let x = inset; x < W - inset; x++) {
      const row = Math.floor((y - 6) / 6)
      const cx = (x + (row % 2) * 4) % 8
      const scallop = (y - 6) % 6 > 3 + Math.abs(cx - 4) * 0.4
      b.px(x, y, scallop ? ROOF[1] : cx < 2 ? ROOF[4] : ROOF[3])
    }
  }
  for (let x = 16; x < W - 16; x++) b.px(x, 6, ROOF[4])
  for (let i = 0; i < 26; i++) {
    const x = 12 + Math.floor(r() * (W - 24))
    const y = 10 + Math.floor(r() * 28)
    b.px(x, y, R.leaf[3])
    b.px(x + 1, y, R.leaf[2])
  }
  // круглое чердачное окошко
  b.shadedEllipse(96, 24, 8, 8, R.wood.slice(1, 4))
  b.shadedEllipse(96, 24, 6, 6, R.lamp.slice(2, 5))
  b.rect(95, 18, 2, 12, R.wood[1])
  b.rect(90, 23, 12, 2, R.wood[1])
  // труба и дымок
  for (let y = 0; y < 18; y++) for (let x = 156; x < 168; x++) b.px(x, y, R.rust[x === 156 ? 4 : x === 167 ? 1 : 3])
  b.rect(154, 0, 16, 3, R.rust[2])
  b.outline(INK)
  s.shadow(W / 2, H - 2, W / 2 - 4, 4)
  s.stamp(b)
  return s
}

// --- Сад ------------------------------------------------------------------------------------

/** Цветок лилии: шесть лепестков звездой с загнутыми кончиками, тёмная серединка, тычинки. */
function lilyBloom(p, cx, cy, size) {
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2 - Math.PI / 2 + 0.25
    for (let t = 0; t <= 1; t += 0.04) {
      const r = size * 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.9
      const x = cx + Math.cos(ang) * t * size
      const y = cy + Math.sin(ang) * t * size * 0.75 + (t > 0.7 ? (t - 0.7) * size * 0.45 : 0)
      p.shadedEllipse(x, y, r, r * 0.8, PINK.slice(1), { bias: 0.12 - t * 0.18 })
    }
  }
  p.shadedEllipse(cx, cy, size * 0.25, size * 0.2, PINK.slice(0, 3))
  for (let k = 0; k < 5; k++) {
    const ang = -Math.PI / 2 + (k - 2) * 0.45
    const x = Math.round(cx + Math.cos(ang) * size * 0.4)
    const y = Math.round(cy + Math.sin(ang) * size * 0.4)
    p.line(cx, cy, x, y, R.leaf[4])
    p.rect(x, y, 2, 1, R.lamp[4])
  }
  for (let i = 0; i < 8; i++) p.px(cx - size * 0.5 + i * size * 0.13, cy + 2 + (i % 2), PINK[1]) // крапинки
}

/** Цвета уснувшей лилии: выцветший розовый, увядшая зелень. */
const DRY_PINK = ['#33242a', '#4d3a40', '#665058', '#7f6970', '#958289', '#a99a9e']

/** Уснувшая лилия: толстый стебель согнулся дугой, большой цветок поник и смотрит в землю, свет погас. */
function sleepingLily() {
  const s = new Sprite(64, 96)
  s.shadow(32, 92, 20, 3)
  const p = new Sprite(64, 96)
  // стебель: прямой внизу, сверху загибается вправо и вниз
  for (let y = 30; y < 94; y++) {
    const x = 28 + Math.round(((94 - y) / 64) ** 2 * 14)
    p.rect(x, y, 4, 1, R.weed[3])
    p.px(x + 4, y, R.weed[1])
  }
  for (let t = 0; t <= 1; t += 0.03) p.rect(Math.round(42 + t * 8), Math.round(30 + t * 12), 3, 2, R.weed[3])
  // широкие опущенные листья с бурыми кончиками
  for (const [y0, dir, len] of [[88, -1, 24], [82, 1, 22], [72, -1, 20], [64, 1, 16]]) {
    for (let k = 0; k < len; k++) {
      const x = 30 + dir * k
      const y = y0 + Math.floor(k / 3)
      const w = Math.max(1, Math.round(3 * Math.sin((k / len) * Math.PI)))
      for (let i = 0; i < w; i++) p.px(x, y + i, k > len - 6 ? R.straw[i === 0 ? 3 : 1] : i === 0 ? R.weed[4] : R.weed[2])
    }
  }
  // большой цветок висит вниз, лепестки сложены колоколом
  const cx = 50
  const cy = 44
  for (const ang of [1.0, 1.25, 1.5, 1.75, 2.0, 2.25]) {
    for (let t = 0; t <= 1; t += 0.04) {
      const r = 3.6 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.8
      p.shadedEllipse(cx + Math.cos(ang) * t * 14, cy + Math.sin(ang) * t * 20, r, r * 0.8, DRY_PINK.slice(1), { bias: 0.05 - t * 0.2 })
    }
  }
  p.shadedEllipse(cx, cy, 4, 3.5, DRY_PINK.slice(0, 3))
  p.outline(INK)
  s.stamp(p)
  for (const [x, y] of [[18, 90], [44, 91], [56, 88]]) s.px(x, y, DRY_PINK[3]) // опавшие лепестки
  return s
}

/** Исполинская розовая лилия 2×3 клетки — ростом с дерево: толстый стебель, широкие листья, два цветка и бутон. */
function giantLily() {
  const s = new Sprite(64, 96)
  s.shadow(32, 92, 20, 3)
  const p = new Sprite(64, 96)
  for (let y = 26; y < 94; y++) {
    const x = 30 + Math.round(Math.sin(y / 12) * 1.5)
    p.rect(x, y, 3, 1, R.leaf[4])
    p.px(x + 3, y, R.leaf[2])
  }
  // ветка ко второму цветку
  p.line(33, 52, 48, 40, R.leaf[3])
  p.line(33, 53, 48, 41, R.leaf[2])
  // широкие листья
  for (const [y0, dir, len] of [[86, -1, 24], [80, 1, 22], [70, -1, 20], [62, 1, 18], [50, -1, 14]]) {
    for (let k = 0; k < len; k++) {
      const x = 32 + dir * k
      const y = y0 - Math.round(Math.sin((k / len) * Math.PI) * 7) - Math.floor(k / 4)
      const w = Math.max(1, Math.round(4 * Math.sin((k / len) * Math.PI)))
      for (let i = 0; i < w; i++) p.px(x, y + i, i === 0 ? R.leaf[5] : i === w - 1 ? R.leaf[2] : R.leaf[3])
    }
  }
  p.line(31, 34, 14, 30, R.leaf[3]) // бутон на отдельной ножке
  p.shadedEllipse(12, 26, 3, 6, PINK.slice(2))
  lilyBloom(p, 49, 37, 13)
  lilyBloom(p, 30, 20, 21)
  p.outline(INK)
  s.stamp(p)
  return s
}

/** Старый дуб 2×3 клетки: густая крона, морщинистый ствол, качели на нижней ветке. */
function oak() {
  const s = new Sprite(64, 96)
  s.shadow(32, 92, 22, 3)
  const t = new Sprite(64, 96)
  for (let y = 50; y < 94; y++) for (let x = 26; x < 38; x++) t.px(x + (y > 88 ? (x < 32 ? -1 : 1) : 0), y, R.wood[x === 26 ? 4 : x > 35 ? 1 : (x + Math.floor(y / 3)) % 5 === 0 ? 1 : 3])
  t.line(36, 58, 52, 52, R.wood[2]) // ветка с качелями
  t.line(36, 59, 52, 53, R.wood[3])
  t.outline(INK)
  s.stamp(t)
  // качели
  s.line(44, 55, 44, 78, R.straw[3])
  s.line(52, 53, 52, 78, R.straw[3])
  s.rect(42, 78, 12, 2, R.wood[4])
  s.rect(42, 80, 12, 1, INK)
  const c = new Sprite(64, 96)
  for (const [x, y, rx, ry] of [[32, 30, 24, 20], [16, 38, 13, 11], [48, 38, 13, 11], [32, 16, 16, 12], [22, 22, 11, 9], [44, 22, 11, 9]])
    c.shadedEllipse(x, y, rx, ry, R.leaf.slice(0, 5), { bias: -0.05 })
  for (let i = 0; i < 40; i++) c.px(10 + (i * 37) % 44, 12 + (i * 23) % 36, R.leaf[5]) // светлые листочки
  c.outline(INK)
  s.stamp(c)
  return s
}

/** Цветущая вишня 2×3 клетки: тёмный изогнутый ствол, розовые облака цветов, падающие лепестки. */
function blossomTree() {
  const s = new Sprite(64, 96)
  s.shadow(32, 92, 18, 3)
  const t = new Sprite(64, 96)
  for (let y = 48; y < 94; y++) {
    const x = 29 + Math.round(Math.sin(y / 9) * 2)
    for (let i = 0; i < 6; i++) t.px(x + i, y, R.wood[i === 0 ? 3 : i === 5 ? 0 : 1])
  }
  t.line(31, 52, 16, 40, R.wood[1])
  t.line(34, 50, 50, 38, R.wood[1])
  t.outline(INK)
  s.stamp(t)
  const c = new Sprite(64, 96)
  for (const [x, y, rx, ry] of [[32, 28, 20, 16], [14, 38, 11, 9], [50, 36, 11, 9], [30, 14, 14, 10], [44, 22, 10, 8], [20, 22, 10, 8]])
    c.shadedEllipse(x, y, rx, ry, PINK.slice(1), { bias: 0.05 })
  for (let i = 0; i < 30; i++) c.px(8 + (i * 29) % 48, 10 + (i * 17) % 36, PINK[5])
  c.outline(INK)
  s.stamp(c)
  for (const [x, y] of [[10, 60], [50, 70], [18, 82], [44, 88], [56, 56]]) s.px(x, y, PINK[4]) // лепестки в воздухе
  return s
}

/** Клумба: тёмная взрыхлённая земля, густо засаженная цветами — флоксы, колокольчики, душистый горошек. */
function flowers(seed) {
  const s = new Sprite(T, T)
  const r = rng(seed)
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) s.px(x, y, (x + y * 3) % 7 === 0 ? R.soil[1] : R.soil[2])
  // кустики зелени
  for (let i = 0; i < 9; i++) s.shadedEllipse(3 + r() * 26, 4 + r() * 25, 3.5, 2.8, R.leaf.slice(1, 5))
  // соцветия: каждое — 3–5 пикселей одного цвета с бликом
  const colors = [[PINK[2], PINK[3]], [PINK[3], PINK[4]], [R.heather[3], R.heather[4]], [R.bone[1], R.bone[2]], [R.straw[3], R.straw[4]]]
  for (let i = 0; i < 16; i++) {
    const x = 2 + Math.floor(r() * 27)
    const y = 2 + Math.floor(r() * 27)
    const [c, hi] = colors[Math.floor(r() * colors.length)]
    s.rect(x, y, 2, 2, c)
    s.px(x - 1, y + 1, c)
    s.px(x + 2, y, c)
    s.px(x, y, hi)
  }
  return s
}

// --- Кухня ----------------------------------------------------------------------------------

/** Лоскутный ковёр по маске соседей: крупные лоскуты приглушённых тканей, стёжка, бахрома по краю. */
function rug(mask) {
  const s = new Sprite(T, T)
  // ткани тёмные и приглушённые: ковёр согревает комнату, но не спорит с полумраком
  const fabrics = [[PINK[0], PINK[1]], [R.heather[1], R.heather[2]], [R.straw[1], R.straw[2]], [R.dew[0], R.dew[1]], [R.rust[1], R.rust[2]]]
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const f = fabrics[(Math.floor(x / 16) * 3 + Math.floor(y / 16) * 2 + mask) % fabrics.length]
      const seam = x % 16 === 0 || y % 16 === 0
      s.px(x, y, seam ? (checker(x, y) ? R.bone[0] : f[0]) : (x + y) % 6 === 0 ? f[0] : f[1])
    }
  const edge = (x, y) => (!(mask & N) && y < 2) || (!(mask & S) && y > T - 3) || (!(mask & W) && x < 2) || (!(mask & E) && x > T - 3)
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (edge(x, y)) s.px(x, y, checker(x, y) ? R.bone[1] : R.bone[0])
  return s
}

/** Полка с вареньем: малиновое, медовое, черничное — по цветам и угадывается рецепт. */
function jarShelf() {
  const s = new Sprite(2 * T, T)
  const p = new Sprite(2 * T, T)
  for (let x = 2; x < 62; x++) {
    p.px(x, 24, R.wood[4])
    p.px(x, 25, R.wood[2])
  }
  p.rect(6, 26, 2, 4, R.wood[1])
  p.rect(56, 26, 2, 4, R.wood[1])
  for (const [x, ramp] of [[8, R.berry], [24, R.lamp], [40, R.dew]]) {
    for (let y = 11; y < 24; y++) for (let i = 0; i < 10; i++) p.px(x + i, y, i === 1 ? ramp[ramp.length - 1] : i > 7 ? ramp[1] : ramp[2])
    for (let i = -1; i < 11; i++) for (let y = 7; y < 11; y++) p.px(x + i, y, (i + y) % 3 === 0 ? R.bone[1] : R.bone[3]) // тканевая крышка
    p.rect(x + 2, 15, 6, 4, R.bone[3]) // этикетка
  }
  p.shadedEllipse(56, 19, 4, 5, R.rust.slice(1)) // горшочек
  p.outline(INK)
  s.stamp(p)
  return s
}

function clock() {
  const s = new Sprite(T, T)
  const c = new Sprite(T, T)
  for (let y = 4; y < 22; y++) for (let x = 8; x < 24; x++) c.px(x, y, R.wood[x < 10 ? 4 : x > 21 ? 1 : 3])
  for (let y = 0; y < 5; y++) for (let x = 6 + y; x < 26 - y; x++) c.px(x, 4 - y, R.wood[2]) // крыша-домик
  c.shadedEllipse(16, 13, 5, 5, R.bone.slice(1)) // циферблат
  c.line(16, 13, 16, 9, INK)
  c.line(16, 13, 13, 13, INK)
  c.rect(14, 5, 4, 3, P.dark) // окошко кукушки
  c.px(15, 6, R.lamp[3])
  c.rect(15, 22, 2, 6, R.straw[3]) // маятник
  c.rect(14, 27, 4, 3, R.straw[4])
  c.outline(INK)
  s.stamp(c)
  return s
}

function bookshelf() {
  const s = new Sprite(2 * T, T)
  const b = new Sprite(2 * T, T)
  for (let y = 0; y < 30; y++) for (let x = 3; x < 61; x++) b.px(x, y, R.wood[x < 5 ? 4 : x > 58 ? 1 : 2])
  for (const shelf of [13, 27]) b.rect(3, shelf, 58, 2, R.wood[4])
  const spines = [R.berry[3], R.dew[3], R.straw[4], R.heather[4], R.leaf[4], R.rust[4], R.bone[2]]
  for (const [top, bottom] of [[2, 13], [16, 27]]) {
    let x = 6
    let i = top
    while (x < 56) {
      const w = 3 + ((x + i) % 3)
      const h = bottom - top - ((x * 7 + i) % 4)
      b.rect(x, bottom - h, w, h, spines[(x + i) % spines.length])
      b.px(x, bottom - h + 2, R.bone[3])
      x += w + 1
      i++
    }
  }
  b.rect(52, 14, 2, 14, R.leaf[5]) // тонкий «Садовый календарь» торчит с краю
  b.outline(INK)
  s.stamp(b)
  return s
}

function pottedPlant() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 7, 2)
  const p = new Sprite(T, T)
  for (let y = 20; y < 29; y++) for (let x = 10 + Math.floor((y - 20) / 3); x < 22 - Math.floor((y - 20) / 3); x++) p.px(x, y, R.rust[x < 12 ? 4 : 3])
  p.rect(9, 19, 14, 2, R.rust[4])
  for (const [x, y] of [[12, 12], [20, 10], [16, 6], [10, 16], [22, 15], [15, 13]]) p.shadedEllipse(x, y, 3.5, 2.5, R.leaf.slice(1))
  p.line(16, 19, 16, 8, R.wood[2])
  p.outline(INK)
  s.stamp(p)
  return s
}

function armchair() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 12, 2)
  const a = new Sprite(T, T)
  a.shadedEllipse(16, 12, 11, 9, R.heather.slice(2), { clip: (x, y) => y <= 18 }) // спинка
  for (let y = 18; y < 27; y++) for (let x = 5; x < 27; x++) a.px(x, y, R.heather[x < 9 || x > 22 ? 3 : 4])
  a.rect(5, 16, 5, 11, R.heather[3]) // подлокотники
  a.rect(22, 16, 5, 11, R.heather[2])
  a.rect(6, 27, 2, 2, R.wood[1])
  a.rect(24, 27, 2, 2, R.wood[1])
  a.rect(9, 20, 14, 3, R.heather[5]) // подушка
  a.outline(INK)
  s.stamp(a)
  for (let y = 14; y < 22; y++) s.rect(22, y, 4, 1, (y % 2 ? R.lamp[3] : R.lamp[4])) // недовязанный шарф
  s.px(24, 22, R.lamp[3])
  return s
}

/** Музыкальная шкатулка на столике; открыта — крышка поднята, внутри вальс и бархат. */
function musicBox(open) {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 9, 2)
  const t = new Sprite(T, T)
  for (let y = 18; y < 21; y++) for (let x = 7; x < 25; x++) t.px(x, y, R.wood[y === 18 ? 5 : 3])
  for (const x of [8, 22]) for (let y = 21; y < 29; y++) t.rect(x, y, 2, 1, R.wood[2])
  t.outline(INK)
  s.stamp(t)
  const b = new Sprite(T, T)
  for (let y = 10; y < 18; y++) for (let x = 9; x < 23; x++) b.px(x, y, R.wood[x < 11 ? 5 : x > 20 ? 2 : 4])
  for (let x = 10; x < 22; x += 3) b.px(x, 15, R.straw[5]) // резьба
  if (open) {
    for (let y = 2; y < 10; y++) for (let x = 9; x < 23; x++) b.px(x, y, R.wood[y < 4 ? 5 : 3])
    b.rect(10, 9, 12, 2, R.berry[2]) // бархат
  } else {
    b.rect(9, 9, 14, 2, R.wood[5])
    for (const x of [11, 14, 17, 20]) b.px(x, 12, R.lamp[4]) // колёсики
  }
  b.outline(INK)
  s.stamp(b)
  if (open) for (const [x, y] of [[6, 4], [25, 6], [27, 2]]) s.px(x, y, R.lamp[5]) // ноты
  return s
}

function herbPots() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 12, 2)
  const p = new Sprite(T, T)
  for (const [x, ramp] of [[5, R.leaf], [13, R.weed], [21, R.leaf]]) {
    for (let y = 22; y < 29; y++) for (let i = 0; i < 7; i++) p.px(x + i, y, R.rust[i === 0 ? 4 : i === 6 ? 2 : 3])
    for (let k = 0; k < 5; k++) p.shadedEllipse(x + 1 + k * 1.3, 18 - (k % 2) * 3, 2, 2.5, ramp.slice(1))
  }
  p.outline(INK)
  s.stamp(p)
  return s
}

/** Буфет с чашками; нижний ящик заперт на замок — открыт: ящик выдвинут, в нём банка варенья. */
function cupboard(open) {
  const s = new Sprite(T, T)
  const c = new Sprite(T, T)
  for (let y = 0; y < 30; y++) for (let x = 4; x < 28; x++) c.px(x, y, R.wood[x < 6 ? 4 : x > 25 ? 1 : 3])
  c.rect(7, 3, 18, 11, R.dew[0])
  c.rect(15, 3, 2, 11, R.wood[2])
  for (const [x, col] of [[9, R.berry[3]], [12, R.lamp[3]], [19, R.dew[3]], [22, R.heather[4]]]) {
    c.rect(x, 9, 2, 3, col)
    c.px(x, 8, R.bone[3])
  }
  if (open) {
    c.rect(5, 20, 22, 9, R.wood[4])
    c.rect(7, 21, 18, 5, P.dark)
    c.rect(13, 21, 5, 4, R.berry[3]) // банка варенья
    c.rect(13, 20, 5, 1, R.bone[3])
  } else {
    c.rect(7, 18, 18, 10, R.wood[2])
    c.rect(12, 21, 8, 4, R.straw[3]) // латунный замок
    for (const x of [13, 16, 19]) c.px(x, 23, R.lamp[4])
  }
  c.outline(INK)
  s.stamp(c)
  return s
}

/** Печь: белёный бок, чугунная дверца, угли, пузатый чайник на плите. */
/** Печь; lit — разожжена: в устье пляшет огонь, угли светятся, из чайника пар. */
function hearth(lit = false) {
  const s = new Sprite(2 * T, T)
  const h = new Sprite(2 * T, T)
  for (let y = 6; y < 30; y++) for (let x = 4; x < 60; x++) h.px(x, y, x < 7 ? R.bone[3] : x > 56 ? R.bone[0] : y < 9 ? R.bone[3] : R.bone[2])
  for (let x = 4; x < 60; x += 9) h.rect(x, 6, 1, 24, R.bone[1])
  h.rect(18, 14, 26, 13, R.silver[0])
  for (let y = 16; y < 25; y++) for (let x = 20; x < 42; x++) h.px(x, y, y > 20 ? pick(R.lamp.slice(0, 3), (y - 20) / 5, x, y) : P.dark)
  h.rect(18, 27, 26, 2, R.silver[1])
  if (lit) {
    // огонь: три языка пламени над углями, от жёлтого к оранжевому
    for (const [cx, height] of [[25, 8], [31, 10], [37, 7]]) {
      for (let y = 0; y < height; y++) {
        const w = Math.max(1, Math.round((height - y) / 3))
        for (let x = -w; x <= w; x++) h.px(cx + x, 25 - y, y > height * 0.6 ? R.lamp[5] : y > height * 0.3 ? R.lamp[4] : R.lamp[3])
      }
    }
    for (let x = 20; x < 42; x += 2) h.px(x, 25, R.lamp[2])
  }
  h.outline(INK)
  s.stamp(h)
  const k = new Sprite(2 * T, T)
  k.shadedEllipse(48, 3, 6, 4, R.dew.slice(1)) // чайник
  k.rect(53, 1, 4, 2, R.dew[2]) // носик
  k.rect(46, -1, 4, 2, R.silver[2])
  k.outline(INK)
  s.stamp(k)
  if (lit) for (const [x, y] of [[55, 0], [57, -2], [56, -4]]) s.px(x, y, R.bone[3], 160) // пар из носика
  return s
}

function breadTable() {
  const s = new Sprite(2 * T, T)
  s.shadow(32, 29, 28, 2.5)
  const t = new Sprite(2 * T, T)
  for (let y = 12; y < 17; y++) for (let x = 3; x < 61; x++) t.px(x, y, R.wood[y === 12 ? 5 : y > 15 ? 2 : 4])
  for (let x = 3; x < 61; x += 6) t.px(x, 14, R.berry[3]) // скатерть с вышивкой по краю
  for (const x of [6, 55]) for (let y = 17; y < 29; y++) for (let i = 0; i < 3; i++) t.px(x + i, y, R.wood[i === 0 ? 3 : 1])
  t.outline(INK)
  s.stamp(t)
  const l = new Sprite(2 * T, T)
  l.shadedEllipse(22, 9, 9, 5, R.straw.slice(1))
  for (const x of [17, 22, 27]) l.px(x, 7, R.straw[1])
  for (let y = 7; y < 12; y++) for (let x = 38; x < 50; x++) l.px(x, y, R.bone[3]) // карточка с рецептом
  for (const y of [8, 10]) l.rect(40, y, 8, 1, R.bone[0])
  l.rect(48, 6, 6, 2, R.silver[2]) // ложка
  l.shadedEllipse(56, 9, 3, 3, R.bone.slice(1)) // чашка
  l.outline(INK)
  s.stamp(l)
  return s
}

/** Колодец; полный — внутри блестит вода, ведро поднято с водой. */
function well(full = false) {
  const s = new Sprite(T, T)
  s.shadow(16, 28, 12, 2.5)
  const w = new Sprite(T, T)
  for (let y = 16; y < 28; y++) for (let x = 5; x < 27; x++) w.px(x, y, (y - 16) % 4 === 3 ? R.stone[1] : (x + Math.floor((y - 16) / 4) * 3) % 7 === 0 ? R.stone[1] : R.stone[3])
  w.ellipse(16, 16, 11, 3, R.stone[4])
  w.ellipse(16, 16.5, 8.5, 2, full ? R.dew[2] : P.dark)
  if (full) w.rect(12, 16, 3, 1, R.dew[4])
  w.rect(6, 4, 2, 13, R.wood[2])
  w.rect(24, 4, 2, 13, R.wood[2])
  for (let y = 1; y < 6; y++) for (let x = 3 + (5 - y); x < 29 - (5 - y); x++) w.px(x, y, y === 1 ? ROOF[4] : ROOF[3])
  w.rect(8, 8, 16, 1, R.straw[2])
  w.rect(15, 9, 1, full ? 2 : 4, R.straw[2])
  w.rect(13, full ? 10 : 13, 5, 3, R.wood[3])
  if (full) w.rect(14, 10, 3, 1, R.dew[3])
  w.outline(INK)
  s.stamp(w)
  for (const x of [4, 26]) s.px(x, 27, PINK[3]) // цветы у сруба
  return s
}

/** Фонарный столб; зажжён — тёплый огонёк за стеклом. */
function lampPost(lit = false) {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 6, 2)
  const p = new Sprite(T, T)
  p.rect(15, 10, 3, 19, R.silver[1])
  p.rect(13, 28, 7, 2, R.silver[0])
  p.rect(11, 2, 11, 9, R.silver[0])
  if (lit) for (let y = 3; y < 10; y++) for (let x = 12; x < 21; x++) p.px(x, y, pick(R.lamp.slice(2), 1 - Math.abs(x - 16) / 6, x, y))
  else p.rect(12, 3, 9, 7, R.dew[0])
  p.px(13, 4, lit ? R.lamp[5] : R.dew[2])
  p.rect(10, 1, 13, 2, R.silver[2])
  p.outline(INK)
  s.stamp(p)
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
  for (const x of [10, 22]) for (let y = 0; y < 5; y++) c.rect(x - (x < 16 ? 0 : y > 2 ? 1 : 0), 22 + y, 1 + y, 1, fur[2])
  for (let x = 12; x < 21; x += 3) c.px(x, 35, fur[1])
  c.outline(INK)
  s.stamp(c)
  s.rect(12, 30, 3, 1, INK)
  s.rect(18, 29, 2, 2, frame ? INK : R.lamp[4])
  if (!frame) s.px(18, 29, INK)
  s.px(16, 32, R.berry[4])
  return s
}

/** Символы на колёсиках буфета 12×12: ягода, мёд, черника, мята. */
function symbol(kind) {
  const s = new Sprite(12, 12)
  if (kind === 'berry') {
    s.shadedEllipse(6, 7, 4, 4, R.berry.slice(1))
    s.rect(5, 1, 3, 2, R.leaf[4])
    s.px(4, 6, R.bone[3])
  } else if (kind === 'honey') {
    for (let y = 2; y < 11; y++) for (let x = 3 + Math.abs(6 - y) / 2; x < 9 - Math.abs(6 - y) / 2; x++) s.px(x, y, R.lamp[y < 5 ? 4 : 3])
    s.px(5, 4, R.lamp[5])
  } else if (kind === 'blueberry') {
    s.shadedEllipse(6, 7, 4, 4, R.dew.slice(0, 3))
    s.rect(5, 3, 2, 1, R.dew[0])
    s.px(4, 6, R.dew[4])
  } else {
    for (const [x, y] of [[4, 4], [8, 4], [6, 8]]) s.shadedEllipse(x, y, 2.5, 3, R.leaf.slice(2))
    s.line(6, 11, 6, 6, R.leaf[2])
  }
  s.outline(INK)
  return s
}

/** Поленница у печи. */
function firewood() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 12, 2)
  const w = new Sprite(T, T)
  for (const [x, y] of [[9, 25], [16, 25], [23, 25], [12, 19], [19, 19], [16, 13]]) {
    w.shadedEllipse(x, y, 3.5, 3, R.wood.slice(1, 5))
    w.ellipse(x, y, 1.5, 1.2, R.straw[4]) // спил
  }
  w.outline(INK)
  s.stamp(w)
  return s
}

/** Корзинка с клубками у кресла. */
function yarnBasket() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 10, 2)
  const b = new Sprite(T, T)
  for (let y = 19; y < 28; y++) for (let x = 7 + Math.floor((y - 19) / 4); x < 25 - Math.floor((y - 19) / 4); x++) b.px(x, y, (x + y) % 3 === 0 ? R.straw[1] : R.straw[3])
  for (const [x, y, c] of [[11, 17, PINK], [17, 16, R.dew], [21, 18, R.lamp]]) b.shadedEllipse(x, y, 3.5, 3.5, c.slice(1, 5))
  b.line(21, 18, 27, 26, R.lamp[3]) // нитка
  b.outline(INK)
  s.stamp(b)
  return s
}

/** Мешок муки. */
function flourSack() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 9, 2)
  const b = new Sprite(T, T)
  b.shadedEllipse(16, 21, 8, 8, R.bone.slice(0, 4), { bias: 0.05 })
  b.rect(13, 11, 6, 3, R.bone[1])
  b.rect(12, 13, 8, 1, R.straw[2]) // завязка
  b.outline(INK)
  s.stamp(b)
  s.rect(13, 20, 6, 3, R.wood[2]) // надпись-клеймо
  return s
}

/** Засохшая клумба: сухая земля, пожухлые кустики, поникшие бесцветные головки. */
function dryBed(seed) {
  const s = new Sprite(T, T)
  const r = rng(seed)
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) s.px(x, y, (x + y * 3) % 7 === 0 ? R.soil[1] : R.soil[2])
  for (let i = 0; i < 8; i++) s.shadedEllipse(3 + r() * 26, 5 + r() * 24, 3, 2.3, [R.straw[0], R.straw[1], R.weed[1], R.weed[2]])
  for (let i = 0; i < 10; i++) {
    const x = 2 + Math.floor(r() * 28)
    const y = 4 + Math.floor(r() * 26)
    s.rect(x, y, 2, 1, DRY_PINK[3])
    s.px(x, y + 1, DRY_PINK[2])
  }
  return s
}

/** Калитка в живой изгороди, запертая; на замке — кошачья лапка Мяты. */
function gateClosed() {
  const s = new Sprite(T, T)
  const h = new Sprite(T, T)
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (x < 7 || x > 24) h.px(x, y, noise(x, y, 4, 9, 1e9) > 0.55 ? R.leaf[3] : R.leaf[2])
  for (let y = 4; y < 30; y++) for (let x = 7; x < 25; x++) h.px(x, y, (x - 7) % 5 === 4 ? R.wood[1] : R.wood[3])
  h.rect(7, 10, 18, 2, R.wood[2])
  h.rect(7, 22, 18, 2, R.wood[2])
  h.outline(INK)
  s.stamp(h)
  s.rect(14, 15, 5, 5, R.silver[1]) // замок
  s.px(16, 18, PINK[3]) // кошачья лапка
  s.px(15, 16, PINK[3])
  s.px(17, 16, PINK[3])
  return s
}

/** Ёжик Шуршик: колючая спинка, соломенная шляпка, крошечная лейка. Кадр 1 — шмыгнул носом. */
function shurshik(frame) {
  const s = new Sprite(32, 48)
  s.shadow(16, 46, 9, 1.5)
  const h = new Sprite(32, 48)
  h.shadedEllipse(15, 39, 9, 6.5, R.wood.slice(0, 4)) // колючки
  for (let i = 0; i < 12; i++) h.px(7 + i * 1.4, 33 + (i % 3), R.wood[0])
  h.shadedEllipse(21, 40, 5, 4.5, R.straw.slice(2, 6), { bias: 0.1 }) // мордочка
  h.rect(25 + frame, 39, 2, 2, INK) // нос
  h.shadedEllipse(15, 32, 6, 2, R.straw.slice(2)) // шляпка
  h.shadedEllipse(15, 30, 3, 2.5, R.straw.slice(2), { clip: (x, y) => y <= 31 })
  h.rect(5, 41, 4, 3, R.dew[2]) // лейка
  h.rect(3, 41, 2, 1, R.dew[2])
  h.outline(INK)
  s.stamp(h)
  s.px(21, 38, INK) // глаз
  s.px(22, 37, P.white)
  return s
}

export function manorFrames() {
  const frames = {
    prop_manor: manor(),
    prop_giant_lily: sleepingLily(),
    prop_giant_lily_awakened: giantLily(),
    prop_gate_closed: gateClosed(),
    npc_shurshik_0: shurshik(0),
    npc_shurshik_1: shurshik(1),
    prop_oak: oak(),
    prop_blossom_tree: blossomTree(),
    prop_well: well(),
    prop_well_awakened: well(true),
    prop_lamp_post: lampPost(),
    prop_lamp_post_awakened: lampPost(true),
    prop_hearth: hearth(),
    prop_hearth_awakened: hearth(true),
    prop_jar_shelf: jarShelf(),
    prop_cupboard: cupboard(false),
    prop_cupboard_open: cupboard(true),
    prop_clock: clock(),
    prop_bookshelf: bookshelf(),
    prop_potted_plant: pottedPlant(),
    prop_bread_table: breadTable(),
    prop_armchair: armchair(),
    prop_music_box: musicBox(false),
    prop_music_box_open: musicBox(true),
    prop_herb_pots: herbPots(),
    prop_firewood: firewood(),
    prop_yarn_basket: yarnBasket(),
    prop_flour_sack: flourSack(),
    npc_myata_0: myata(0),
    npc_myata_1: myata(1),
  }
  for (let i = 0; i < 3; i++) frames[`flowers_${i}`] = flowers(300 + i * 7)
  for (let i = 0; i < 3; i++) frames[`dry_bed_${i}`] = dryBed(320 + i * 7)
  for (let m = 0; m < 16; m++) frames[`rug_${m}`] = rug(m)
  for (const k of ['berry', 'honey', 'blueberry', 'mint']) frames[`sym_${k}`] = symbol(k)
  return frames
}

export { BOTTLE }
