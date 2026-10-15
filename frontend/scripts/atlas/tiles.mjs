// Земля 32×32: трава, сорняки, тропа и грядки с краями по соседям, забор и калитка.
// Края: маска соседей того же типа — N=1, E=2, S=4, W=8. Где соседа нет, трава наползает на тропу,
// а у грядки появляется бортик. Так тропа и грядки выглядят цельными, а не набором квадратов.

import { bayer, noise, pick, rng, Sprite } from './canvas.mjs'
import { INK, P, R } from './palette.mjs'

export const T = 32
const N = 1
const E = 2
const S = 4
const W = 8

// --- Трава --------------------------------------------------------------------------------

/** Заливка травой: мелкая фактура + пучки травинок + редкие цветочки и камешки. */
export function grassFill(s, seed, { flowers = true } = {}) {
  const r = rng(seed)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      // основа общая для всех вариантов и бесшовная (период 32) — на стыках клеток нет шахматки
      const n = noise(x, y, 8, 100, T) * 0.65 + noise(x, y, 16, 101, T) * 0.35
      s.px(x, y, pick(R.grass.slice(2, 5), Math.min(0.999, Math.max(0, (n - 0.2) * 1.4)), x, y))
    }
  // пучки: 2–3 травинки, тёмное основание, светлый кончик
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(r() * T)
    const y = Math.floor(r() * (T - 4)) + 4
    for (let b = 0; b < 3; b++) {
      const bx = x + b - 1
      const h = 2 + Math.floor(r() * 3)
      for (let k = 0; k < h; k++) s.px(bx + (k === h - 1 && b !== 1 ? (b === 0 ? -1 : 1) : 0), y - k, k === 0 ? R.grass[0] : k === h - 1 ? R.grass[5] : R.grass[2])
    }
  }
  if (flowers && r() > 0.45) {
    const fx = 4 + Math.floor(r() * 24)
    const fy = 4 + Math.floor(r() * 24)
    s.px(fx, fy, r() > 0.5 ? '#efe4b0' : '#e7c86a')
    s.px(fx, fy + 1, R.grass[1])
  }
  if (r() > 0.6) {
    const px = 3 + Math.floor(r() * 26)
    const py = 3 + Math.floor(r() * 26)
    s.px(px, py, R.stone[4])
    s.px(px + 1, py, R.stone[3])
    s.px(px, py + 1, R.stone[1])
  }
}

export function grass(seed) {
  const s = new Sprite(T, T)
  grassFill(s, seed)
  return s
}

/** Высокий пучок сорняка: веер травинок с наклоном, тень у корня, семенные головки. */
export function weedClump(s, x, y, r, ramp = R.weed) {
  s.ellipse(x, y + 1, 4, 1.4, '#1f2412', 70)
  const blades = 5 + Math.floor(r() * 3)
  for (let i = 0; i < blades; i++) {
    const lean = (i - blades / 2) * 0.45 + (r() - 0.5)
    const h = 5 + Math.floor(r() * 6)
    for (let k = 0; k < h; k++) {
      const t = k / h
      s.px(x + lean * t * 3, y - k, ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))])
    }
    if (r() > 0.6) s.px(x + lean * 3, y - h, R.grass[5])
  }
}

export function weeds(seed) {
  const s = grass(seed)
  const r = rng(seed * 7 + 3)
  for (let i = 0; i < 3; i++) weedClump(s, 5 + r() * 22, 10 + r() * 20, r)
  return s
}

// --- Края по соседям ----------------------------------------------------------------------

/** Насколько глубоко трава наползает на клетку у края без соседа (0 — края нет). */
function edgeDepth(x, y, mask, seed) {
  const wobble = (v) => 3 + Math.floor(noise(v, 0, 3, seed, T) * 3)
  let d = -Infinity // нет открытых краёв — нет и травы/бортика
  if (!(mask & N)) d = Math.max(d, wobble(x) - y)
  if (!(mask & S)) d = Math.max(d, wobble(x + 40) - (T - 1 - y))
  if (!(mask & W)) d = Math.max(d, wobble(y + 80) - x)
  if (!(mask & E)) d = Math.max(d, wobble(y + 120) - (T - 1 - x))
  return d
}

/** Тропа: утоптанная земля с камешками; у краёв без соседей — наползающая трава. */
export function path(mask, seed = 300) {
  const s = new Sprite(T, T)
  const r = rng(seed + mask)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const n = noise(x, y, 5, seed, T) * 0.6 + noise(x, y, 2, seed + 9, T) * 0.4
      s.px(x, y, pick(R.path.slice(1, 5), n, x, y))
    }
  // колея посередине чуть темнее
  for (let i = 0; i < 6; i++) {
    const x = 3 + r() * 26
    const y = 3 + r() * 26
    s.px(x, y, R.stone[4])
    s.px(x + 1, y, R.stone[3])
    s.px(x, y + 1, R.path[0])
    s.px(x + 1, y + 1, R.path[1])
  }
  // трава по краям
  const grassLayer = new Sprite(T, T)
  grassFill(grassLayer, seed + 50 + mask, { flowers: false })
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const d = edgeDepth(x, y, mask, seed)
      if (d > 0) {
        const i = (y * T + x) * 4
        const hex = '#' + [0, 1, 2].map((k) => grassLayer.data[i + k].toString(16).padStart(2, '0')).join('')
        s.px(x, y, hex)
      } else if (d > -2) {
        s.px(x, y, R.path[0], 90) // тень под кромкой травы
      }
    }
  return s
}

/** Грядка: борозды с гребнями и комьями; у краёв без соседей — бортик и трава снаружи. */
export function soil(mask, overgrown = false, seed = 400) {
  const s = new Sprite(T, T)
  const r = rng(seed + mask * 3 + (overgrown ? 99 : 0))
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const row = (y + 2) % 8
      // гребень: светлый верх, тёмная ложбина
      const base = row < 1 ? 5 : row < 3 ? 4 : row < 6 ? 3 : 2
      const n = noise(x, y, 3, seed, T)
      s.px(x, y, R.soil[Math.max(1, Math.min(5, base + (n > 0.75 ? 1 : n < 0.2 ? -1 : 0)))])
    }
  for (let i = 0; i < 10; i++) {
    const x = r() * 30
    const y = r() * 30
    s.px(x, y, R.soil[5])
    s.px(x + 1, y + 1, R.soil[1])
  }
  // бортик и трава снаружи
  const grassLayer = new Sprite(T, T)
  grassFill(grassLayer, seed + 70 + mask, { flowers: false })
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const d = edgeDepth(x, y, mask, seed + 5)
      if (d > 1) {
        const i = (y * T + x) * 4
        s.px(x, y, '#' + [0, 1, 2].map((k) => grassLayer.data[i + k].toString(16).padStart(2, '0')).join(''))
      } else if (d > -1) {
        // бортик: светлый сверху-слева, тёмный снизу-справа
        const top = !(mask & N) && y < 8
        const left = !(mask & W) && x < 8
        s.px(x, y, top || left ? R.soil[5] : R.soil[0])
      }
    }
  if (overgrown) {
    for (let i = 0; i < 90; i++) {
      const x = r() * T
      const y = r() * T
      s.px(x, y, pick(R.weed, r(), Math.floor(x), Math.floor(y)))
    }
    for (let i = 0; i < 6; i++) weedClump(s, 4 + r() * 24, 7 + r() * 24, r)
  }
  return s
}

// --- Забор и калитка -----------------------------------------------------------------------

/** Доска штакетника с волокнами, гвоздём и мхом у земли. */
function plank(s, x, top, bottom, r) {
  const ramp = R.oldWood
  for (let y = top; y <= bottom; y++)
    for (let i = 0; i < 4; i++) {
      const tone = i === 0 ? 4 : i === 3 ? 1 : 3 - (noise(x + i, y, 3, 77, 1e9) > 0.6 ? 1 : 0)
      s.px(x + i, y, ramp[tone])
    }
  // заострённый срез сверху
  s.clear(x, top)
  s.clear(x + 3, top)
  s.px(x + 1, top - 1, ramp[4])
  s.px(x + 2, top - 1, ramp[3])
  // волокна
  for (let k = 0; k < 2; k++) {
    const gy = top + 4 + Math.floor(r() * (bottom - top - 8))
    s.px(x + 1 + Math.floor(r() * 2), gy, ramp[1])
    s.px(x + 1 + Math.floor(r() * 2), gy + 1, ramp[1])
  }
  if (r() > 0.55) s.rect(x, bottom - 2, 4, 3, R.weed[2])
  if (r() > 0.7) s.px(x + 1, top + 6, R.rust[2])
}

export function fenceHorizontal(seed = 600) {
  const s = new Sprite(T, T)
  grassFill(s, seed)
  const r = rng(seed)
  const pickets = new Sprite(T, T)
  for (let x = 0; x < T; x += 6) plank(pickets, x + 1, 4 + Math.floor(r() * 3), 27, r)
  // поперечина с тенью
  for (let x = 0; x < T; x++) {
    pickets.px(x, 12, R.oldWood[4])
    pickets.px(x, 13, R.oldWood[2])
    pickets.px(x, 14, R.oldWood[1])
  }
  for (let x = 2; x < T; x += 6) pickets.px(x + 1, 13, R.stone[4]) // гвозди
  pickets.outline(INK)
  s.shadow(16, 29, 16, 2, 90)
  s.stamp(pickets)
  return s
}

export function fenceVertical(seed = 601) {
  const s = new Sprite(T, T)
  grassFill(s, seed)
  const post = new Sprite(T, T)
  for (let y = 0; y < T; y++)
    for (let x = 13; x < 19; x++) post.px(x, y, R.oldWood[x === 13 ? 4 : x === 18 ? 1 : 3 - ((y + x) % 7 === 0 ? 1 : 0)])
  for (let y = 4; y < T; y += 10) {
    post.rect(13, y, 6, 1, R.oldWood[0])
    post.px(15, y + 1, R.stone[4])
  }
  post.outline(INK)
  s.ellipse(20, 16, 3, 16, '#1f2412', 70)
  s.stamp(post)
  return s
}

export function fencePost(seed = 602) {
  const s = new Sprite(T, T)
  grassFill(s, seed)
  const post = new Sprite(T, T)
  for (let y = 3; y < 28; y++) for (let x = 11; x < 21; x++) post.px(x, y, R.oldWood[x < 13 ? 5 : x > 18 ? 1 : 3])
  post.rect(11, 3, 10, 2, R.oldWood[5])
  post.rect(12, 26, 8, 2, R.weed[2])
  post.outline(INK)
  s.shadow(18, 28, 8, 2, 90)
  s.stamp(post)
  return s
}

/** Калитка: створка поперёк столба; закрыта — оплетена ежевикой с ягодами. */
export function gate(open, seed = 700) {
  const s = fenceVertical(seed)
  const r = rng(seed + (open ? 1 : 0))
  if (open) {
    for (let y = 6; y < 28; y++) for (let x = 12; x < 20; x++) s.px(x, y, pick(R.path.slice(2), noise(x, y, 3, 5, T), x, y))
    const leaf = new Sprite(T, T)
    for (let y = 3; y < 29; y++) for (let x = 21; x < 26; x++) leaf.px(x, y, R.oldWood[x === 21 ? 4 : x === 25 ? 1 : 3])
    leaf.outline(INK)
    s.stamp(leaf)
    s.px(9, 26, R.bramble[2])
    s.px(10, 25, R.leaf[3])
    return s
  }
  const door = new Sprite(T, T)
  for (let y = 5; y < 27; y++) for (let x = 7; x < 25; x++) door.px(x, y, R.oldWood[(x - 7) % 4 === 0 ? 1 : y === 5 ? 4 : 3])
  door.rect(7, 10, 18, 1, R.oldWood[1])
  door.rect(7, 21, 18, 1, R.oldWood[1])
  door.outline(INK)
  s.stamp(door)
  // ежевика: плети, листья, ягоды
  for (let i = 0; i < 6; i++) {
    let x = 4 + r() * 24
    let y = 4 + r() * 24
    for (let k = 0; k < 9; k++) {
      s.px(x, y, R.bramble[k % 2 ? 1 : 2])
      x += r() * 2 - 1
      y += r() * 2 - 1
    }
  }
  for (let i = 0; i < 14; i++) s.px(4 + r() * 24, 4 + r() * 24, R.leaf[r() > 0.5 ? 2 : 3])
  for (let i = 0; i < 7; i++) {
    const x = 6 + r() * 20
    const y = 6 + r() * 20
    s.px(x, y, R.berry[1])
    s.px(x + 1, y, R.berry[2])
    s.px(x, y - 1, R.berry[3])
  }
  return s
}

/** Все тайлы атласа. */
export function tileFrames() {
  const frames = {}
  for (let i = 0; i < 4; i++) frames[`grass_${i}`] = grass(100 + i * 13)
  for (let i = 0; i < 3; i++) frames[`weeds_${i}`] = weeds(200 + i * 17)
  for (let m = 0; m < 16; m++) {
    frames[`path_${m}`] = path(m)
    frames[`soil_${m}`] = soil(m)
    frames[`overgrown_${m}`] = soil(m, true)
  }
  frames.fence_h = fenceHorizontal()
  frames.fence_v = fenceVertical()
  frames.fence_post = fencePost()
  frames.prop_gate = gate(false)
  frames.prop_gate_awakened = gate(true)
  return frames
}

export { bayer, P }
