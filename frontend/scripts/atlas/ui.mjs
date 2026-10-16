// Значки поверх сцены: знак «!», мерцание над тайником, символы замка.

import { Sprite } from './canvas.mjs'
import { INK, P, R } from './palette.mjs'

/**
 * Знак «!» без облачка: толстая палочка и точка, свет слева, почти чёрный контур —
 * читается и на тёмной траве, и в свете лампы. Один и тот же над Вереском и над предметами.
 */
function bang() {
  const s = new Sprite(7, 15)
  const tones = [R.lamp[5], R.lamp[4], R.lamp[2]]
  for (let y = 1; y < 10; y++) for (let i = 0; i < 3; i++) s.px(2 + i, y, y > 7 && i !== 1 ? null : tones[i])
  s.px(3, 8, R.lamp[3])
  s.px(3, 9, R.lamp[2])
  for (let y = 11; y < 14; y++) for (let i = 0; i < 3; i++) s.px(2 + i, y, tones[i])
  s.outline(INK)
  return s
}

/** Мерцание над местом, где что-то спрятано. */
function sparkle() {
  const s = new Sprite(9, 9)
  s.rect(4, 0, 1, 9, R.lamp[4], 200)
  s.rect(0, 4, 9, 1, R.lamp[4], 200)
  s.rect(3, 3, 3, 3, P.petal)
  s.px(4, 4, P.white)
  return s
}

/** Символы на колёсиках замка 12×12: капля, солнце, луна, лист. */
function symbol(kind) {
  const s = new Sprite(12, 12)
  if (kind === 'drop') {
    for (let y = 1; y < 11; y++) {
      const half = y < 5 ? (y - 1) * 0.6 : 3.5 - Math.max(0, y - 8) * 0.9
      for (let x = Math.round(6 - half); x <= Math.round(5 + half); x++) s.px(x, y, x < 5 ? R.dew[4] : R.dew[2])
    }
    s.px(4, 6, P.white)
  } else if (kind === 'sun') {
    s.shadedEllipse(6, 6, 3, 3, R.lamp.slice(2))
    for (const [x, y] of [[6, 0], [6, 11], [0, 6], [11, 6], [2, 2], [10, 2], [2, 10], [10, 10]]) s.px(x, y, R.lamp[3])
  } else if (kind === 'moon') {
    s.shadedEllipse(6, 6, 4.5, 4.5, R.bone.slice(1))
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if ((x - 8.5) ** 2 + (y - 4.5) ** 2 < 14) s.clear(x, y)
  } else {
    for (let y = 2; y < 10; y++) {
      const half = 3.5 - Math.abs(y - 5.5) * 0.8
      for (let x = Math.round(6 - half); x <= Math.round(6 + half); x++) s.px(x + Math.round((y - 6) * -0.3), y, x < 6 ? R.leaf[5] : R.leaf[4])
    }
    s.line(4, 10, 8, 3, R.leaf[2])
  }
  s.outline(INK)
  return s
}

/**
 * Мотыга в руках у персонажа (смотрит вправо; влево игра отражает кадр).
 * up — замах над головой, down — удар: железко уткнулось в землю.
 */
function hoe(down) {
  const s = new Sprite(16, 16)
  const [x0, y0, x1, y1] = down ? [2, 4, 12, 13] : [3, 13, 10, 2]
  s.line(x0, y0, x1, y1, R.wood[4])
  s.line(x0 + 1, y0, x1 + 1, y1, R.wood[2])
  if (down) {
    s.rect(11, 12, 4, 3, R.silver[3])
    s.rect(11, 14, 4, 1, R.silver[1])
  } else {
    s.rect(9, 1, 4, 3, R.silver[3])
    s.rect(12, 1, 1, 3, R.silver[1])
  }
  s.outline(INK)
  return s
}

export function uiFrames() {
  return {
    fx_bubble: bang(),
    fx_interact: bang(),
    fx_sparkle: sparkle(),
    fx_hoe_up: hoe(false),
    fx_hoe_down: hoe(true),
    ...Object.fromEntries(['drop', 'sun', 'moon', 'leaf'].map((k) => [`sym_${k}`, symbol(k)])),
  }
}
