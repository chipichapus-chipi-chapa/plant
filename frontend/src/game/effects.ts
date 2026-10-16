// Короткие анимации в саду. Сейчас одна — прополка: персонаж трижды бьёт мотыгой,
// из земли вылетают клочки сорняков и комья земли. Всё — чистые функции от времени,
// без случайности: один и тот же момент анимации рисуется одинаково в каждом кадре.

import { TILE, type Cell } from './layout'

/** Прополка клетки: где и когда началась (время — как у requestAnimationFrame, performance.now). */
export type WeedEffect = { kind: 'weed'; cell: Cell; at: number }

/** Удар мотыгой: замах + удар. */
const STRIKE_MS = 200
const STRIKES = 3
/** Сколько летит клочок сорняка после удара. */
const FLIGHT_MS = 520
/** Вся анимация: три удара и полёт последних клочков. */
export const WEED_MS = STRIKES * STRIKE_MS + FLIGHT_MS - 100

const GRAVITY = 300 // логических пикселей в секунду²

const WEED = ['#2b4325', '#3d5c2f', '#557a3c']
const DIRT = ['#3d2b1c', '#5b432d']

export function isPlaying(effect: WeedEffect, now: number): boolean {
  return now - effect.at < WEED_MS
}

/** Кадр мотыги: замах или удар; null — удары закончились, мотыгу убрали. */
export function hoeFrame(t: number): 'up' | 'down' | null {
  if (t < 0 || t >= STRIKES * STRIKE_MS) return null
  return t % STRIKE_MS < STRIKE_MS / 2 ? 'up' : 'down'
}

/** На замахе персонаж чуть выпрямляется, на ударе — приседает. */
export function strikeLift(t: number): number {
  return hoeFrame(t) === 'up' ? 1 : 0
}

export type Particle = { x: number; y: number; size: number; color: string }

const hash = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Клочки сорняков и комья земли в момент t после начала: каждый удар выбрасывает горсть,
 * она летит дугой вверх-в стороны и падает. Последний удар выдирает крупные пучки.
 */
export function weedParticles(effect: WeedEffect, t: number): Particle[] {
  const cx = effect.cell.x * TILE + TILE / 2
  const cy = effect.cell.y * TILE + TILE / 2 + 4
  const particles: Particle[] = []
  for (let strike = 0; strike < STRIKES; strike++) {
    const hitAt = strike * STRIKE_MS + STRIKE_MS / 2
    const dt = (t - hitAt) / 1000
    if (dt < 0 || dt * 1000 > FLIGHT_MS) continue
    const count = strike === STRIKES - 1 ? 9 : 6
    for (let i = 0; i < count; i++) {
      const r1 = hash(strike * 31 + i, effect.cell.x * 7 + effect.cell.y)
      const r2 = hash(i * 17 + strike, effect.cell.y * 13 + 5)
      // вверх и в стороны: угол от −160° до −20°
      const angle = (-160 + r1 * 140) * (Math.PI / 180)
      const speed = 50 + r2 * 60
      const x = cx + (r2 - 0.5) * 10 + Math.cos(angle) * speed * dt
      const y = cy + Math.sin(angle) * speed * dt + (GRAVITY * dt * dt) / 2
      const dirt = i % 3 === 0
      const big = strike === STRIKES - 1 && i < 3
      particles.push({
        x: Math.round(x),
        y: Math.round(y),
        size: big ? 3 : dirt ? 1 : 2,
        color: dirt ? DIRT[i % 2] : WEED[(i + strike) % WEED.length],
      })
    }
  }
  return particles
}
