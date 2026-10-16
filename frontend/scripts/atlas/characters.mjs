// Персонажи: главный герой (scripts/atlas/hero.mjs — по листу персонажа) и Мастер Вереск.
// Кадр 32×48: низ — уровень земли клетки.

import { Sprite } from './canvas.mjs'
import { heroFrames } from './hero.mjs'
import { INK, P, R } from './palette.mjs'

export { CH, CW, DIRECTIONS, STEPS } from './hero.mjs'

const frame = () => new Sprite(32, 48)

// --- Мастер Вереск --------------------------------------------------------------------------

/** Мантия цвета сухого вереска с глубоким капюшоном, седая борода, посох с фонарём. */
function vereshk() {
  const s = frame()
  const robe = frame()
  for (let y = 24; y < 46; y++) {
    const half = 6 + (y - 24) * 0.3
    for (let x = Math.round(15 - half); x <= Math.round(15 + half); x++) {
      const t = (x - (15 - half)) / (2 * half)
      const fold = (x + Math.floor(y / 5)) % 5 === 0 && y > 30
      robe.px(x, y, fold ? R.heather[1] : R.heather[t < 0.2 ? 4 : t < 0.65 ? 3 : 2])
    }
  }
  for (let x = 7; x < 24; x++) robe.px(x, 45, R.heather[1])
  for (let x = 10; x < 21; x++) robe.px(x, 34, R.cream[x % 2 ? 2 : 3]) // пояс-верёвка
  robe.rect(11, 35, 1, 4, R.cream[2])
  robe.shadedEllipse(15, 17, 8.5, 8.5, R.heather.slice(1), { bias: 0.05 }) // капюшон
  robe.shadedEllipse(23, 31, 3, 4.5, R.heather.slice(1)) // рукав к посоху
  robe.outline(INK)

  // посох с фонарём: тёплый огонёк в темноте
  const staff = frame()
  for (let y = 6; y < 46; y++) {
    staff.px(26, y, R.wood[4])
    staff.px(27, y, R.wood[2])
  }
  staff.rect(26, 5, 4, 1, R.wood[3])
  staff.rect(29, 6, 1, 2, R.silver[1])
  staff.rect(27, 8, 5, 6, R.silver[1])
  staff.rect(28, 9, 3, 4, R.lamp[3])
  staff.px(29, 10, R.lamp[5])
  staff.px(28, 12, R.lamp[2])
  staff.rect(27, 14, 5, 1, R.silver[0])
  staff.outline(INK)

  // лицо в тени капюшона: только глаза, нос и борода
  const face = frame()
  face.ellipse(15, 19, 5.5, 5, R.heather[0])
  face.shadedEllipse(15, 20, 4.5, 4, R.skinFixed.slice(0, 4), { bias: -0.1 })
  face.rect(12, 17, 3, 1, R.silver[4]) // кустистые брови
  face.rect(16, 17, 3, 1, R.silver[3])
  face.rect(13, 19, 1, 2, INK)
  face.rect(17, 19, 1, 2, INK)
  face.shadedEllipse(15, 27, 5, 5.5, R.silver, { bias: 0.05 }) // борода
  for (const x of [13, 15, 17]) for (let y = 25; y < 32; y += 2) face.px(x, y, R.silver[1])
  face.rect(12, 22, 7, 2, R.silver[3]) // усы
  face.px(15, 21, R.skinFixed[1])
  face.outline(INK)

  const hand = frame()
  hand.shadedEllipse(25.5, 31, 1.8, 1.8, R.skinFixed.slice(1))
  hand.outline(INK)

  s.shadow(16, 46, 11, 1.8)
  s.stamp(staff)
  s.stamp(robe)
  s.stamp(face)
  s.stamp(hand)
  return s
}

export function characterFrames() {
  return { npc_vereshk: vereshk(), ...heroFrames() }
}

export { P }
