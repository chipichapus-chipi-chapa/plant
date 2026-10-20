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

/** Ирис из городка у мельницы: узкие листья-мечи, потом сине-фиолетовый цветок с жёлтой полоской. */
export function iris(stage) {
  if (stage === 0) return sprout()
  const s = new Sprite(PW, PH)
  const VIOLET = ['#3b2f5e', '#5a4a8c', '#7d6cb4', '#a597d4']
  const top = stage === 1 ? GROUND - 18 : GROUND - 24
  // листья-мечи веером
  for (const [x, h, lean] of [[11, 14, -2], [14, 18, -1], [18, 17, 1], [21, 13, 2]]) {
    s.line(16, GROUND, x + lean, GROUND - h, R.leaf[3])
    s.line(17, GROUND, x + lean + 1, GROUND - h + 1, R.leaf[1])
  }
  stem(s, 15, top, GROUND - 4)
  if (stage === 1) {
    s.shadedEllipse(16, top - 1, 2, 4.5, VIOLET)
  } else {
    // три опущенных лепестка и три поднятых
    for (const [dx, dy, rx, ry] of [[-4, 2, 3, 2.2], [4, 2, 3, 2.2], [0, 4, 2.4, 2.6]]) s.shadedEllipse(16 + dx, top + dy, rx, ry, VIOLET, { bias: -0.1 })
    for (const [dx, dy] of [[-2, -3], [2, -3], [0, -5]]) s.shadedEllipse(16 + dx, top + dy, 1.6, 2.6, VIOLET.slice(1), { bias: 0.15 })
    for (const [dx, dy] of [[-4, 2], [4, 2], [0, 4]]) s.px(16 + dx, top + dy, R.lamp[2])
  }
  s.outline(INK)
  const base = canvas()
  base.stamp(s)
  return base
}

/** Роза из городка: кустик с бутонами, потом приглушённо-алые цветы (не кричащие — «не так ярко»). */
export function rose(stage) {
  if (stage === 0) return sprout()
  const s = new Sprite(PW, PH)
  const RED = ['#5e1f2b', '#8a3040', '#b04b5a', '#d27a84']
  const big = stage === 2
  // кустик: ветки и листья
  for (const [x, y] of [[11, 10], [16, big ? 16 : 13], [21, 11]]) s.line(16, GROUND, x, GROUND - y, R.wood[2])
  for (const [x, y, rx] of [[10, 8, 3.5], [22, 9, 3.5], [14, 13, 3], [19, 14, 3], [16, 5, 4]]) leaf(s, x, GROUND - y, rx, 2.2, 0.08)
  const flowers = big ? [[11, 12], [16, 18], [21, 13]] : [[13, 13], [19, 14]]
  for (const [x, y] of flowers) {
    const cy = GROUND - y
    if (big) {
      s.shadedEllipse(x, cy, 3, 2.6, RED)
      s.px(x, cy - 1, RED[0])
      s.px(x - 1, cy, RED[1])
      s.px(x + 1, cy - 1, RED[3])
    } else {
      s.shadedEllipse(x, cy, 1.5, 2.2, RED.slice(1))
      s.px(x, cy + 2, R.leaf[2])
    }
  }
  s.outline(INK)
  const base = canvas()
  base.stamp(s)
  return base
}

/** Маргаритки: низкая розетка, потом белые цветочки с розовыми кончиками и жёлтой серединкой. */
export function daisy(stage) {
  if (stage === 0) return sprout()
  const s = new Sprite(PW, PH)
  for (const [x, y] of [[11, 3], [16, 2], [21, 3], [13, 4], [19, 4]]) leaf(s, x, GROUND - y, 3, 1.5, 0.1)
  const heads = stage === 1 ? [[12, 8], [19, 9]] : [[9, 11], [15, 15], [22, 12], [19, 8], [12, 8]]
  for (const [x, y] of heads) {
    const cy = GROUND - y
    stem(s, x, cy + 1, GROUND - 2)
    if (stage === 1) {
      s.rect(x - 1, cy - 1, 2, 2, '#e8cfd6')
      continue
    }
    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]]) {
      s.px(x + dx, cy + dy, Math.abs(dx) + Math.abs(dy) === 2 && dx * dy === 0 ? '#e9b9c6' : P.petal)
    }
    s.px(x, cy, R.lamp[2])
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
  for (const i of [0, 1, 2]) frames[`plant_iris_${i}`] = iris(i)
  for (const i of [0, 1, 2]) frames[`plant_rose_${i}`] = rose(i)
  for (const i of [0, 1, 2]) frames[`plant_daisy_${i}`] = daisy(i)
  return frames
}

export { finish }
