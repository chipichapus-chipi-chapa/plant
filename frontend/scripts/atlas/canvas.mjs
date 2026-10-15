// Холст в памяти и приёмы рисования: заливки, контур, объём с дизерингом, шум.

import { INK } from './palette.mjs'

const rgba = (hex, a = 255) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  a,
]

// Упорядоченный дизеринг 4×4 (матрица Байера): плавные переходы без размытия
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

export const bayer = (x, y) => BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4]

export class Sprite {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.data = new Uint8ClampedArray(w * h * 4)
  }

  px(x, y, color, alpha = 255) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !color) return
    const [r, g, b, a] = rgba(color, alpha)
    const i = (y * this.w + x) * 4
    // альфа-композиция «поверх»
    const sa = a / 255
    const da = this.data[i + 3] / 255
    const oa = sa + da * (1 - sa)
    if (oa === 0) return
    this.data[i] = (r * sa + this.data[i] * da * (1 - sa)) / oa
    this.data[i + 1] = (g * sa + this.data[i + 1] * da * (1 - sa)) / oa
    this.data[i + 2] = (b * sa + this.data[i + 2] * da * (1 - sa)) / oa
    this.data[i + 3] = oa * 255
  }

  /** Стереть пиксель (сделать прозрачным). */
  clear(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.data.fill(0, (y * this.w + x) * 4, (y * this.w + x) * 4 + 4)
  }

  /** Есть ли в пикселе что-то непрозрачное. */
  filled(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false
    return this.data[(y * this.w + x) * 4 + 3] > 0
  }

  rect(x, y, w, h, color, alpha) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, color, alpha)
  }

  ellipse(cx, cy, rx, ry, color, alpha) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.px(x, y, color, alpha)
  }

  line(x0, y0, x1, y1, color, alpha) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= steps; i++) this.px(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, color, alpha)
  }

  /** Мягкая тень под объектом. */
  shadow(cx, cy, rx, ry, alpha = 80) {
    this.ellipse(cx, cy, rx, ry, '#1f2412', alpha)
  }

  /**
   * Объёмный эллипс: оттенок из рампы зависит от того, насколько точка «смотрит» на свет
   * (свет сверху-слева); на границах тонов — дизеринг.
   */
  shadedEllipse(cx, cy, rx, ry, ramp, { light = [-0.55, -0.75], bias = 0, clip } = {}) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / rx
        const ny = (y - cy) / ry
        const d = nx * nx + ny * ny
        if (d > 1 || (clip && !clip(x, y))) continue
        const nz = Math.sqrt(Math.max(0, 1 - d))
        // центр — основной тон, сверху-слева — блик, снизу-справа — тень
        const lit = (nx * light[0] + ny * light[1]) * 0.45 + nz * 0.35 + 0.25 + bias
        this.px(x, y, pick(ramp, lit, x, y))
      }
  }

  /** Тёмный контур вокруг всего нарисованного (снаружи силуэта). */
  outline(color = INK) {
    const marks = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (!this.filled(x, y) && (this.filled(x - 1, y) || this.filled(x + 1, y) || this.filled(x, y - 1) || this.filled(x, y + 1)))
          marks.push([x, y])
    for (const [x, y] of marks) this.px(x, y, color)
  }

  /** Наложить другой спрайт со смещением. */
  stamp(other, ox = 0, oy = 0) {
    for (let y = 0; y < other.h; y++)
      for (let x = 0; x < other.w; x++) {
        const i = (y * other.w + x) * 4
        const a = other.data[i + 3]
        if (!a) continue
        const hex = '#' + [0, 1, 2].map((k) => other.data[i + k].toString(16).padStart(2, '0')).join('')
        this.px(x + ox, y + oy, hex, a)
      }
  }
}

/** Оттенок из рампы по освещённости 0..1, с дизерингом между соседними тонами. */
export function pick(ramp, lit, x, y) {
  const v = Math.max(0, Math.min(0.9999, lit)) * ramp.length
  const i = Math.floor(v)
  const frac = v - i
  return frac > bayer(x, y) && i + 1 < ramp.length ? ramp[i + 1] : ramp[i]
}

/** Детерминированный генератор: одинаковые спрайты при каждом запуске. */
export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const hash = (x, y, seed) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Гладкий шум 0..1 (value noise) с повтором через period — тайлы стыкуются без шва. */
export function noise(x, y, scale, seed, period = 1e9) {
  const fx = x / scale
  const fy = y / scale
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const p = Math.max(1, Math.round(period / scale))
  const w = (t) => t * t * (3 - 2 * t)
  const tx = w(fx - x0)
  const ty = w(fy - y0)
  const at = (i, j) => hash(((i % p) + p) % p, ((j % p) + p) % p, seed)
  const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx
  const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx
  return a + (b - a) * ty
}
