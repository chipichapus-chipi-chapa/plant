// Персонажи по образцу садовника в остроконечной шляпе (docs/ART_DIRECTION.md).
// Кадр 40×64: низ — уровень земли клетки. Чиби: голова почти в половину роста, лицо вполоборота
// вправо, высокие глаза с бликом, румянец, крупные ботинки.
//
// Слои игрока рисуются МАРКЕРНЫМИ цветами — игра перекрашивает их в выбранные цвета
// (src/game/character.ts): deep → shade → base → light — это рампа одного цвета.

import { Sprite } from './canvas.mjs'
import { INK, P, R } from './palette.mjs'

export const CW = 40
export const CH = 64

const M = { deep: '#400040', shade: '#800080', base: '#ff00ff', light: '#ff80ff', blush: '#ff0080' }
const MASK_RAMP = [M.deep, M.shade, M.base, M.light]

const frame = () => new Sprite(CW, CH)

// --- Тело -------------------------------------------------------------------------------

function body() {
  const s = frame()
  const skin = frame()
  // ноги и туловище (туловище закроет одежда)
  skin.rect(15, 52, 4, 6, M.base)
  skin.rect(22, 52, 4, 6, M.base)
  skin.rect(13, 41, 15, 12, M.base)
  // руки: свет слева
  for (let y = 42; y < 50; y++) {
    skin.px(10, y, M.light)
    skin.rect(11, y, 2, 1, M.base)
    skin.rect(28, y, 2, 1, M.base)
    skin.px(30, y, M.shade)
  }
  skin.shadedEllipse(11.5, 50.5, 2, 2, MASK_RAMP)
  skin.shadedEllipse(29, 50.5, 2, 2, MASK_RAMP)
  skin.rect(18, 37, 5, 5, M.shade) // шея в тени головы
  // голова и ухо
  skin.shadedEllipse(9.5, 30, 2.2, 2.8, MASK_RAMP)
  skin.shadedEllipse(20.5, 28, 11.5, 10.5, MASK_RAMP, { bias: 0.08 })
  skin.outline(INK)

  // ботинки — свой цвет
  const boots = frame()
  boots.shadedEllipse(16.5, 58.5, 4.2, 3, R.wood.slice(1, 6))
  boots.shadedEllipse(24, 58.5, 4.2, 3, R.wood.slice(1, 6))
  boots.rect(12, 61, 9, 1, R.wood[0])
  boots.rect(20, 61, 9, 1, R.wood[0])
  boots.outline(INK)

  s.shadow(20, 62, 11, 2, 90)
  s.stamp(boots)
  s.stamp(skin)
  // лицо вполоборота: высокие глаза с бликом, румянец, маленький рот
  for (const ex of [18, 25]) {
    s.rect(ex, 29, 2, 4, INK)
    s.px(ex, 29, P.white)
    s.px(ex + 1, 32, '#4a3a44')
  }
  s.rect(15, 34, 3, 1, M.blush)
  s.rect(26, 34, 3, 1, M.blush)
  s.px(16, 35, M.blush)
  s.rect(22, 36, 2, 1, M.deep)
  s.px(29, 32, M.shade) // намёк на нос в профиль
  return s
}

// --- Одежда ---------------------------------------------------------------------------------

const cream = (lit) => R.cream[Math.max(0, Math.min(4, Math.round(lit * 4)))]

function outfit(style) {
  const s = frame()
  if (style === 'overalls') {
    // светлая рубашка: туловище и рукава-фонарики
    for (let y = 41; y < 49; y++) for (let x = 13; x < 28; x++) s.px(x, y, cream(1 - (x - 13) / 18))
    s.shadedEllipse(11.5, 43.5, 2.6, 2.6, R.cream)
    s.shadedEllipse(29, 43.5, 2.6, 2.6, R.cream, { bias: -0.15 })
    // комбинезон: нагрудник, лямки, штанины
    for (let y = 44; y < 55; y++) for (let x = 15; x < 26; x++) s.px(x, y, x === 15 ? M.light : x >= 24 ? M.shade : M.base)
    s.rect(14, 51, 13, 3, M.base)
    s.rect(14, 51, 1, 3, M.light)
    for (let y = 54; y < 58; y++) {
      s.rect(15, y, 4, 1, M.base)
      s.rect(22, y, 4, 1, M.base)
      s.px(18, y, M.shade)
      s.px(25, y, M.shade)
    }
    s.rect(15, 41, 2, 3, M.base)
    s.rect(24, 41, 2, 3, M.shade)
    s.rect(18, 46, 5, 3, M.shade) // карман
    s.rect(18, 46, 5, 1, M.deep)
    s.px(16, 44, R.sun[4])
    s.px(24, 44, R.sun[3])
    s.rect(20, 52, 1, 5, M.deep) // складка между ног
    s.px(16, 56, M.light) // потёртая коленка
  } else if (style === 'sweater') {
    for (let y = 41; y < 54; y++)
      for (let x = 12; x < 29; x++) s.px(x, y, (y - 41) % 3 === 2 && (x + y) % 2 === 0 ? M.shade : x < 15 ? M.light : x > 25 ? M.shade : M.base)
    for (let y = 42; y < 51; y++) {
      s.rect(10, y, 3, 1, y % 3 === 0 ? M.shade : M.base)
      s.px(10, y, M.light)
      s.rect(28, y, 3, 1, M.shade)
    }
    s.rect(10, 49, 3, 2, M.deep)
    s.rect(28, 49, 3, 2, M.deep)
    s.rect(12, 52, 17, 2, M.deep) // резинка
    s.rect(16, 41, 9, 1, M.light) // ворот
    for (let y = 54; y < 58; y++) {
      s.rect(15, y, 4, 1, R.wood[2])
      s.rect(22, y, 4, 1, R.wood[1])
    }
  } else {
    // сарафан поверх рубашки
    s.shadedEllipse(11.5, 43, 2.6, 2.4, R.cream)
    s.shadedEllipse(29, 43, 2.6, 2.4, R.cream, { bias: -0.15 })
    s.rect(16, 41, 9, 1, cream(0.8))
    for (let y = 42; y < 49; y++) for (let x = 13; x < 28; x++) s.px(x, y, x < 15 ? M.light : x > 25 ? M.shade : M.base)
    for (let y = 48; y < 59; y++) {
      const half = 7.5 + (y - 48) * 0.45
      for (let x = Math.round(20.5 - half); x <= Math.round(20.5 + half); x++) {
        const fold = (x + Math.floor((y - 48) / 3)) % 5 === 0
        s.px(x, y, fold ? M.shade : x < 20.5 - half + 2 ? M.light : x > 20.5 + half - 3 ? M.shade : M.base)
      }
    }
    s.rect(13, 48, 15, 1, M.deep) // пояс
    for (let x = 9; x < 33; x++) s.px(x, 58, M.deep)
  }
  s.outline(INK)
  return s
}

// --- Волосы ---------------------------------------------------------------------------------

/** Прядь: сужается книзу, тень по правому краю. */
function strand(s, x, top, length, width = 3) {
  for (let k = 0; k < length; k++) {
    const w = Math.max(1, Math.round(width * (1 - k / (length + 1))))
    for (let i = 0; i < w; i++) s.px(x + i, top + k, i === w - 1 && w > 1 ? M.shade : M.base)
  }
}

function hairFront(style) {
  const s = frame()
  if (style === 'bun') s.shadedEllipse(20, 14, 5.5, 4.8, MASK_RAMP)
  if (style === 'curly') {
    for (const [x, y] of [[11, 20], [16, 16], [22, 15], [28, 18], [31, 23], [9, 25], [13, 23], [25, 20], [19, 19]])
      s.shadedEllipse(x, y, 4, 3.6, MASK_RAMP)
  } else {
    s.shadedEllipse(20.5, 24, 12.6, 8.8, MASK_RAMP, { clip: (x, y) => y <= 24, bias: 0.05 })
  }
  // чёлка: короткая над глазами, длиннее по краям лица — глаза всегда открыты
  for (const [x, len] of [[9, 8], [12, 4], [15, 3], [19, 2], [23, 2], [26, 2], [29, 6]]) strand(s, x, 24, len)
  // пряди у лица
  const sideLen = { short: [10, 7], bob: [15, 13], long: [22, 18], braid: [11, 7], bun: [10, 7], curly: [14, 11] }[style]
  strand(s, 8, 24, sideLen[0], 4)
  strand(s, 30, 24, sideLen[1], 3)
  if (style === 'braid') {
    for (let k = 0; k < 6; k++) s.shadedEllipse(31 + (k % 2), 36 + k * 3.2, 2.6, 2, MASK_RAMP)
    s.rect(30, 55, 4, 1, R.berry[2])
  }
  // блик дугой на макушке
  for (let x = 12; x < 22; x++) s.px(x, 19 + Math.round(((x - 16) / 6) ** 2 * 2), M.light)
  s.outline(INK)
  return s
}

/** Задний слой волос — за спиной (длинные, каре, кудри). */
function hairBack(style) {
  const s = frame()
  if (style === 'long') {
    s.shadedEllipse(20.5, 30, 13, 12, MASK_RAMP, { bias: -0.15 })
    for (let y = 36; y < 52; y++) for (let x = 8; x < 33; x++) s.px(x, y, x < 12 ? M.base : x > 29 ? M.deep : M.shade)
    for (let x = 8; x < 33; x += 3) s.px(x, 52, M.shade)
  } else if (style === 'bob') {
    s.shadedEllipse(20.5, 30, 13, 11, MASK_RAMP, { bias: -0.15 })
  } else if (style === 'curly') {
    for (const [x, y] of [[8, 32], [32, 31], [10, 38], [30, 37]]) s.shadedEllipse(x, y, 4, 4, MASK_RAMP, { bias: -0.2 })
  } else {
    return null
  }
  s.outline(INK)
  return s
}

// --- Мелочи --------------------------------------------------------------------------------

function accessory(kind) {
  const s = frame()
  if (kind === 'gardener_hat') {
    // высокая остроконечная соломенная шляпа с заломом, как на образце
    s.shadedEllipse(20, 22.5, 19, 4.6, R.straw, { bias: 0.05 })
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const bend = t > 0.75 ? (t - 0.75) * 10 : 0
      const cx = 19 + 11 * t ** 1.4 + bend * 1.2
      const cy = 19 - 17 * t + bend * 1.6
      const rad = 8.5 * (1 - t) + 1
      s.shadedEllipse(cx, cy, rad, rad * 0.75, R.straw, { bias: 0.08 })
    }
    // плетение: тёмные стежки рядами
    for (let y = 4; y < 24; y += 2)
      for (let x = 2; x < 38; x++) if ((x + y) % 4 === 0 && s.filled(x, y) && s.filled(x, y - 1)) s.px(x, y, R.straw[1], 140)
    for (let x = 11; x < 28; x++) {
      s.px(x, 17 + (x > 20 ? 0 : 0), R.straw[0])
      s.px(x, 18, R.rust[2])
    }
  } else if (kind === 'straw_hat') {
    s.shadedEllipse(20, 22, 17, 4.2, R.straw, { bias: 0.05 })
    s.shadedEllipse(20, 17, 10, 6.5, R.straw, { clip: (x, y) => y <= 21 })
    for (let x = 11; x < 30; x++) {
      s.px(x, 19, R.berry[2])
      s.px(x, 20, R.berry[1])
    }
  } else if (kind === 'scarf') {
    for (let y = 38; y < 42; y++) for (let x = 13; x < 28; x++) s.px(x, y, R.berry[y === 38 ? 4 : x > 24 ? 1 : 2])
    for (let y = 42; y < 50; y++) for (let x = 23; x < 27; x++) s.px(x, y, (y - 42) % 3 === 1 ? R.cream[3] : R.berry[x === 23 ? 3 : 1])
  } else if (kind === 'glasses') {
    for (const cx of [18.5, 25.5])
      for (let a = 0; a < 32; a++) s.px(cx + Math.cos((a / 32) * Math.PI * 2) * 3, 30.5 + Math.sin((a / 32) * Math.PI * 2) * 3, INK)
    s.rect(21, 30, 2, 1, INK)
    return s
  } else if (kind === 'flower') {
    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]]) s.px(10 + dx, 21 + dy, P.petal)
    s.rect(9, 20, 2, 2, R.sun[3])
    s.px(13, 24, R.leaf[4])
    s.px(14, 25, R.leaf[3])
  } else {
    return null
  }
  s.outline(INK)
  return s
}

// --- Мастер Вереск --------------------------------------------------------------------------

/** Мантия цвета вереска с капюшоном, седые волосы и борода, посох с цветущим вереском. */
function vereshk() {
  const s = frame()
  const v = frame()
  // мантия: трапеция, свет слева, складки
  for (let y = 34; y < 62; y++) {
    const half = 9 + (y - 34) * 0.42
    for (let x = Math.round(20 - half); x <= Math.round(20 + half); x++) {
      const t = (x - (20 - half)) / (2 * half)
      const fold = (x + Math.floor(y / 4)) % 6 === 0 && y > 40
      v.px(x, y, fold ? R.heather[1] : R.heather[t < 0.2 ? 5 : t < 0.55 ? 4 : t < 0.8 ? 3 : 2])
    }
  }
  for (let x = 6; x < 35; x++) v.px(x, 61, R.heather[1]) // подол
  // пояс-верёвка с узлом
  for (let x = 12; x < 29; x++) v.px(x, 45, R.cream[x % 2 ? 2 : 3])
  v.rect(14, 46, 2, 5, R.cream[2])
  // капюшон
  v.shadedEllipse(20, 27, 13.5, 13.5, R.heather.slice(1), { bias: 0.05 })
  // рукав, тянущийся к посоху
  v.shadedEllipse(30, 43, 4.5, 6, R.heather.slice(1), { bias: -0.05 })
  v.outline(INK)

  // посох с веточкой цветущего вереска
  const staff = frame()
  for (let y = 7; y < 62; y++) {
    staff.px(34, y, R.wood[4])
    staff.px(35, y, R.wood[2])
  }
  for (const [x, y] of [[32, 4], [34, 2], [36, 3], [37, 6], [33, 7], [35, 5], [31, 6], [38, 4]]) {
    staff.px(x, y, R.heather[6])
    staff.px(x, y + 1, R.heather[3])
  }
  for (const [x, y] of [[33, 9], [36, 9], [37, 8]]) staff.px(x, y, R.leaf[3])
  staff.outline(INK)

  // лицо в тени капюшона
  const face = frame()
  face.shadedEllipse(20, 27, 8, 8, R.skinFixed, { bias: 0.05 })
  for (let x = 12; x < 29; x++) for (let y = 19; y < 22; y++) if (face.filled(x, y)) face.px(x, y, R.heather[1], 170)
  // седые пряди по бокам лица
  for (let y = 22; y < 33; y++) {
    face.px(12, y, R.silver[3])
    face.px(13, y, R.silver[4])
    face.px(27, y, R.silver[2])
  }
  // кустистые брови и глаза
  face.rect(15, 24, 4, 1, R.silver[5])
  face.rect(22, 24, 4, 1, R.silver[4])
  face.rect(16, 26, 2, 2, INK)
  face.rect(23, 26, 2, 2, INK)
  face.px(16, 26, P.white)
  face.px(23, 26, P.white)
  face.px(20, 29, R.skinFixed[1]) // нос
  // борода с прядями и усы
  face.shadedEllipse(20, 37, 8.5, 9, R.silver, { bias: 0.05 })
  for (const x of [16, 19, 22, 25]) for (let y = 34; y < 45; y += 2) face.px(x, y, R.silver[1])
  face.shadedEllipse(20, 31.5, 5, 2, R.silver.slice(2))
  face.outline(INK)

  // рука на посохе
  const hand = frame()
  hand.shadedEllipse(33, 44, 2.4, 2.2, R.skinFixed)
  hand.outline(INK)

  s.shadow(20, 62, 13, 2, 90)
  s.stamp(staff)
  s.stamp(v)
  s.stamp(face)
  s.stamp(hand)
  return s
}

export function characterFrames() {
  const frames = { char_body: body(), npc_vereshk: vereshk() }
  for (const k of ['overalls', 'sweater', 'dress']) frames[`char_outfit_${k}`] = outfit(k)
  for (const k of ['short', 'bob', 'long', 'braid', 'bun', 'curly']) {
    frames[`char_hair_${k}`] = hairFront(k)
    const back = hairBack(k)
    if (back) frames[`char_hairback_${k}`] = back
  }
  for (const k of ['gardener_hat', 'straw_hat', 'scarf', 'glasses', 'flower']) {
    const acc = accessory(k)
    if (acc) frames[`char_acc_${k}`] = acc
  }
  return frames
}
