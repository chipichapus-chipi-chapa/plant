// Значки поверх сцены: знак «!», стрелка задания, мерцание над тайником.

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

/** Стрелка задания: смотрит вниз, на цель. */
function questArrow() {
  const s = new Sprite(13, 12)
  const body = [[4, 0, 5, 5], [1, 5, 11, 2], [2, 7, 9, 1], [3, 8, 7, 1], [4, 9, 5, 1], [5, 10, 3, 1], [6, 11, 1, 1]]
  for (const [x, y, w, h] of body) s.rect(x, y, w, h, R.lamp[3])
  s.rect(5, 1, 1, 5, R.lamp[5])
  s.rect(4, 7, 5, 1, R.lamp[1])
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

export function uiFrames() {
  return { fx_bubble: bang(), fx_interact: bang(), fx_arrow: questArrow(), fx_sparkle: sparkle() }
}
