// Значки поверх сцены: облачка «!», стрелка задания, мерцание над тайником.

import { Sprite } from './canvas.mjs'
import { INK, P, R } from './palette.mjs'

function bubbleBase(fill) {
  const s = new Sprite(11, 13)
  s.rect(1, 0, 9, 1, INK)
  s.rect(0, 1, 11, 8, INK)
  s.rect(1, 9, 9, 1, INK)
  s.rect(1, 1, 9, 8, fill)
  s.rect(2, 1, 7, 1, P.white)
  s.rect(3, 10, 3, 1, INK)
  s.rect(4, 11, 2, 1, INK)
  s.px(4, 10, fill)
  return s
}

/** Красный «!» над наставником: ему есть что сказать. */
function newsBubble() {
  const s = bubbleBase(P.petal)
  s.rect(5, 2, 1, 4, R.berry[1])
  s.px(5, 7, R.berry[1])
  return s
}

/** Золотой «!»: рядом то, с чем можно взаимодействовать. */
function interactBubble() {
  const s = bubbleBase(R.sun[3])
  s.rect(2, 1, 7, 1, R.sun[5])
  s.rect(5, 2, 1, 4, INK)
  s.px(5, 7, INK)
  return s
}

/** Стрелка задания: смотрит вниз, на цель. */
function questArrow() {
  const s = new Sprite(13, 12)
  const body = [[4, 0, 5, 5], [1, 5, 11, 2], [2, 7, 9, 1], [3, 8, 7, 1], [4, 9, 5, 1], [5, 10, 3, 1], [6, 11, 1, 1]]
  for (const [x, y, w, h] of body) s.rect(x, y, w, h, R.sun[3])
  s.rect(5, 1, 1, 5, R.sun[5])
  s.rect(4, 7, 5, 1, R.sun[1])
  s.outline(INK)
  return s
}

/** Мерцание над местом, где что-то спрятано. */
function sparkle() {
  const s = new Sprite(9, 9)
  s.rect(4, 0, 1, 9, R.sun[4], 200)
  s.rect(0, 4, 9, 1, R.sun[4], 200)
  s.rect(3, 3, 3, 3, P.petal)
  s.px(4, 4, P.white)
  return s
}

export function uiFrames() {
  return { fx_bubble: newsBubble(), fx_interact: interactBubble(), fx_arrow: questArrow(), fx_sparkle: sparkle() }
}
