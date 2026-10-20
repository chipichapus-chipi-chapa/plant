// Лунная поляна: ковёр светящихся лунных цветов, каменные фонари, сова Ухта.

import { rng, Sprite } from './canvas.mjs'
import { T } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

const MOON = ['#2b3d55', '#4f6f93', '#8fb5d6', '#c9e2f2', '#f0f8ff']
const LILAC = ['#3e2e57', '#5b4680', '#8a74b4', '#c2b2e2']
const OWL = ['#2d241c', '#4a3a2b', '#6b553f', '#8f7457', '#b39876']

/** Клетка лунных цветов: тёмная трава и бледные колокольчики; seed — свой узор у каждой клетки. */
function moonflowers(seed) {
  const s = new Sprite(T, T)
  const r = rng(40 + seed)
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) s.px(x, y, (x * 7 + y * 3 + seed) % 11 === 0 ? R.grass[2] : R.grass[1])
  for (let i = 0; i < 7; i++) {
    const x = 3 + Math.floor(r() * 26)
    const y = 6 + Math.floor(r() * 22)
    s.line(x, y + 1, x, y + 5, R.leaf[2])
    s.px(x - 1, y + 3, R.leaf[3])
    // колокольчик: светлая серединка, синеватые края
    s.rect(x - 1, y - 1, 3, 2, MOON[3])
    s.px(x, y - 1, MOON[4])
    s.px(x - 1, y + 1, MOON[2])
    s.px(x + 1, y + 1, MOON[2])
  }
  return s
}

/** Каменный фонарь 1×1: холодный фитиль или мягкий лиловый огонь. */
function gladeLamp(lit) {
  const s = new Sprite(T, T)
  const b = new Sprite(T, T)
  b.rect(12, 22, 8, 8, R.stone[3])
  b.rect(10, 28, 12, 2, R.stone[2])
  b.rect(9, 10, 14, 12, R.stone[4])
  b.rect(12, 13, 8, 7, lit ? LILAC[3] : P.dark)
  if (lit) {
    b.rect(14, 14, 4, 5, '#f4ecff')
    b.px(15, 13, LILAC[2])
  }
  for (let y = 4; y < 10; y++) {
    const half = 3 + (y - 4) * 1.4
    for (let x = Math.round(16 - half); x <= Math.round(16 + half); x++) b.px(x, y, y < 6 ? R.stone[5] : R.stone[3])
  }
  for (const [x, y] of [[10, 8], [13, 6], [19, 7], [21, 9]]) b.px(x, y, R.leaf[3]) // мох на крыше
  b.outline(INK)
  s.shadow(16, 30, 8, 1.5)
  s.stamp(b)
  return s
}

/** Сова на пеньке: глаза-плошки, ушки-перья; frame 1 — моргает. */
function owl(frame) {
  const s = new Sprite(32, 48)
  s.shadow(16, 46, 9, 1.5)
  const b = new Sprite(32, 48)
  b.rect(9, 38, 14, 8, R.wood[2]) // пенёк
  b.rect(9, 38, 14, 2, R.wood[4])
  b.shadedEllipse(16, 30, 8, 9, OWL, { bias: 0.05 }) // тело
  b.shadedEllipse(16, 21, 7, 6, OWL, { bias: 0.1 }) // голова
  b.rect(10, 14, 2, 3, OWL[1]) // ушки-перья
  b.rect(20, 14, 2, 3, OWL[1])
  for (let y = 27; y < 37; y += 3) b.rect(13, y, 6, 1, OWL[4]) // пёрышки на груди
  b.outline(INK)
  s.stamp(b)
  for (const x of [13, 19]) {
    if (frame) {
      s.rect(x - 2, 21, 4, 1, INK)
    } else {
      s.shadedEllipse(x, 21, 2.5, 2.5, ['#c98a2a', '#f0c25a', '#ffe08a'])
      s.rect(x, 21, 1, 1, INK)
    }
  }
  s.px(16, 23, '#c98a2a') // клюв
  s.px(16, 24, '#8a5a1a')
  return s
}

/**
 * Просвет в лесу 1×1: тропка уходит вниз, в темноту между двумя еловыми стволами,
 * по краям — пара лунных колокольчиков, чтобы выход было видно ночью.
 */
function trailExit(up = false) {
  const s = trailDown()
  if (!up) return s
  // тропка вглубь чащи (вверх): тот же рисунок, перевёрнутый — у поляны светлее, в чаще темнее
  const flipped = new Sprite(T, T)
  for (let y = 0; y < T; y++) flipped.data.set(s.data.subarray((T - 1 - y) * T * 4, (T - y) * T * 4), y * T * 4)
  return flipped
}

function trailDown() {
  const s = new Sprite(T, T)
  // тропка: светлее у поляны (сверху), темнее к лесу (снизу)
  for (let y = 0; y < T; y++) {
    const half = 6 - Math.floor(y / 8)
    for (let x = 16 - half; x < 16 + half; x++) s.px(x, y, y < 12 ? R.dirt[3] : y < 22 ? R.dirt[2] : R.dirt[1])
  }
  for (let y = 18; y < T; y++) for (let x = 0; x < T; x++) if (Math.abs(x - 16) > 6 - Math.floor(y / 8)) s.px(x, y, P.dark, Math.min(255, (y - 18) * 18))
  // еловые стволы по бокам
  for (const x of [3, 27]) {
    s.rect(x, 4, 3, 28, R.wood[1])
    s.rect(x, 4, 1, 28, R.wood[2])
  }
  for (const [x, y] of [[8, 6], [24, 8]]) {
    s.line(x, y + 1, x, y + 4, R.leaf[2])
    s.rect(x - 1, y - 1, 3, 2, MOON[3])
    s.px(x, y - 1, MOON[4])
  }
  return s
}

export function gladeFrames() {
  return {
    moonflowers_0: moonflowers(0),
    moonflowers_1: moonflowers(1),
    moonflowers_2: moonflowers(2),
    prop_trail_exit: trailExit(),
    prop_trail_deep: trailExit(true),
    prop_glade_lamp: gladeLamp(false),
    prop_glade_lamp_awakened: gladeLamp(true),
    npc_owl_0: owl(0),
    npc_owl_1: owl(1),
  }
}
