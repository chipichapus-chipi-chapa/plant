// Растения по стадиям: на тёмной земле посадки — самое живое пятно сада.
// Кадр 32×48: низ — уровень земли клетки, верх может выступать над клеткой.

import { Sprite } from './canvas.mjs'
import { INK, P, R } from './palette.mjs'

const PW = 32
const PH = 48
const GROUND = PH - 6

function canvas() {
  const s = new Sprite(PW, PH)
  // лунка свежей земли
  s.ellipse(16, GROUND + 1, 7, 2, R.soil[1])
  s.ellipse(15, GROUND, 5, 1, R.soil[4])
  return s
}

/** Лист: объёмный эллипс из рампы листвы. */
const leaf = (s, x, y, rx, ry, bias = 0) => s.shadedEllipse(x, y, rx, ry, R.leaf.slice(1), { bias })

function stem(s, x, top, bottom) {
  for (let y = top; y < bottom; y++) {
    s.px(x, y, R.leaf[4])
    s.px(x + 1, y, R.leaf[2])
  }
}

function finish(s) {
  const plant = new Sprite(PW, PH)
  plant.stamp(s)
  return plant
}

function sprout() {
  const s = new Sprite(PW, PH)
  stem(s, 15, GROUND - 6, GROUND)
  leaf(s, 12, GROUND - 7, 3, 1.6, 0.1)
  leaf(s, 19, GROUND - 8, 3, 1.6)
  s.outline(INK)
  const base = canvas()
  base.stamp(s)
  return base
}

export function radish(stage) {
  if (stage === 0) return sprout()
  const s = new Sprite(PW, PH)
  const big = stage === 2
  if (big) {
    // красная макушка корнеплода выглядывает из земли
    s.shadedEllipse(16, GROUND - 1, 5.5, 3.5, R.berry)
    s.px(14, GROUND - 3, R.berry[4])
  }
  const h = big ? 13 : 8
  leaf(s, 10, GROUND - h, 3.5, big ? 6 : 4, 0.05)
  leaf(s, 22, GROUND - h, 3.5, big ? 6 : 4, -0.05)
  leaf(s, 16, GROUND - h - 4, 3, big ? 7 : 5, 0.12)
  for (const x of [10, 16, 22]) s.line(16, GROUND - 2, x, GROUND - h, R.leaf[2])
  s.outline(INK)
  const base = canvas()
  base.stamp(s)
  return base
}

export function chamomile(stage) {
  if (stage === 0) return sprout()
  const s = new Sprite(PW, PH)
  for (const [x, y] of [[10, 11], [22, 11], [13, 15], [19, 15], [16, 9]]) {
    stem(s, x, GROUND - y, GROUND)
    leaf(s, x - 1, GROUND - y + 5, 2, 1.2)
  }
  if (stage === 2) {
    for (const [x, y] of [[10, 19], [16, 23], [22, 18], [13, 14], [20, 13]]) {
      const cy = GROUND - y
      for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]]) s.px(x + dx, cy + dy, P.petal)
      s.px(x - 2, cy, '#9c9282')
      s.rect(x - 1, cy - 1, 2, 2, R.lamp[3])
      s.px(x, cy, R.lamp[1])
    }
  }
  s.outline(INK)
  const base = canvas()
  base.stamp(s)
  return base
}

export function sunflower(stage) {
  if (stage === 0) return sprout()
  const s = new Sprite(PW, PH)
  const height = [0, 12, 24, 34][stage]
  stem(s, 15, GROUND - height, GROUND)
  leaf(s, 10, GROUND - Math.round(height * 0.35), 4.5, 2.2, 0.08)
  leaf(s, 21, GROUND - Math.round(height * 0.55), 4.5, 2.2)
  if (stage >= 2) leaf(s, 10, GROUND - Math.round(height * 0.78), 3.5, 2)
  const top = GROUND - height
  if (stage === 2) s.shadedEllipse(16, top, 3.5, 3.5, R.leaf.slice(2))
  if (stage === 3) {
    s.shadedEllipse(16, top, 8, 7, R.lamp.slice(1))
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2
      s.px(16 + Math.round(Math.cos(ang) * 7), top + Math.round(Math.sin(ang) * 6), R.lamp[1])
    }
    s.shadedEllipse(16, top, 3.5, 3.5, R.soil.slice(0, 4))
    for (const [dx, dy] of [[-1, -1], [1, 0], [0, 1]]) s.px(16 + dx, top + dy, R.soil[5])
  }
  s.outline(INK)
  const base = canvas()
  base.stamp(s)
  return base
}

/** Розовая лилия из шкатулки поместья: листья с бутоном, потом раскрытый розовый цветок. */
export function lily(stage) {
  if (stage === 0) return sprout()
  const s = new Sprite(PW, PH)
  const PINK = ['#8f3a62', '#c25a8a', '#e486ad', '#f6b4cf']
  const top = stage === 1 ? GROUND - 16 : GROUND - 26
  stem(s, 15, top, GROUND)
  leaf(s, 10, GROUND - 6, 5, 1.6, 0.1)
  leaf(s, 21, GROUND - 10, 5, 1.6)
  if (stage === 1) {
    s.shadedEllipse(16, top - 2, 2.5, 5, PINK)
  } else {
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2 - Math.PI / 2
      for (let t = 0; t <= 1; t += 0.1) s.shadedEllipse(16 + Math.cos(ang) * t * 8, top + Math.sin(ang) * t * 6, 2, 1.6, PINK, { bias: 0.1 - t * 0.2 })
    }
    s.shadedEllipse(16, top, 2, 1.6, PINK.slice(0, 2))
    s.px(15, top - 2, R.lamp[4])
    s.px(17, top - 2, R.lamp[4])
  }
  s.outline(INK)
  const base = canvas()
  base.stamp(s)
  return base
}

export function plantFrames() {
  const frames = {}
  for (const i of [0, 1, 2]) frames[`plant_radish_${i}`] = radish(i)
  for (const i of [0, 1, 2]) frames[`plant_chamomile_${i}`] = chamomile(i)
  for (const i of [0, 1, 2, 3]) frames[`plant_sunflower_${i}`] = sunflower(i)
  for (const i of [0, 1, 2]) frames[`plant_lily_${i}`] = lily(i)
  return frames
}

export { finish }
