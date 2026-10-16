// Персонажи в духе Inscryption: маленькие чиби с крупной круглой головой, глазами-точками,
// плоскими заливками в 3–4 тона и толстым почти чёрным контуром (docs/ART_DIRECTION.md).
// Кадр 32×48: низ — уровень земли клетки.
//
// У игрока три направления — down (к зрителю), up (спиной), side (вправо; влево игра отражает кадр)
// и три фазы шага: 0 — стоит, 1 и 2 — шаг левой и правой. Слои рисуются МАРКЕРНЫМИ цветами,
// игра перекрашивает их в выбранные цвета (src/game/character.ts): deep → shade → base → light.

import { Sprite } from './canvas.mjs'
import { INK, P, R } from './palette.mjs'

export const CW = 32
export const CH = 48
export const DIRECTIONS = ['down', 'up', 'side']
export const STEPS = [0, 1, 2]

const M = { deep: '#400040', shade: '#800080', base: '#ff00ff', light: '#ff80ff', blush: '#ff0080' }
const MASK_RAMP = [M.deep, M.shade, M.base, M.light]

const frame = () => new Sprite(CW, CH)

// --- Поза: где ноги и руки в каждой фазе шага ----------------------------------------------

const HIP = 37
const FOOT = 41

/**
 * Ноги: для каждой — функция x(y) левого края, ширина, нижняя строка и задняя ли она.
 * Спереди и сзади шаг виден как приподнятая нога; сбоку ноги расходятся ножницами.
 */
function legs(dir, step) {
  if (dir === 'side') {
    if (step === 0) return [{ x: () => 15, w: 4, bottom: FOOT, back: false, toe: 1 }]
    const spread = (y) => Math.round((y - HIP) * 0.8)
    // в обеих фазах ноги расходятся одинаково, но вперёд выходит то левая, то правая
    return [
      { x: (y) => 14 - spread(y), w: 3, bottom: FOOT, back: true, toe: 1 },
      { x: (y) => 16 + spread(y), w: 3, bottom: FOOT, back: false, toe: 1, swap: step === 2 },
    ]
  }
  const lift = (i) => (step === i + 1 ? 1 : 0)
  return [
    { x: () => 12, w: 3, bottom: FOOT - lift(0), back: false, toe: 0 },
    { x: () => 17, w: 3, bottom: FOOT - lift(1), back: false, toe: 0 },
  ]
}

/** Руки: плечо и кисть. Сбоку рука качается вперёд-назад в такт шагу. */
function arms(dir, step) {
  if (dir === 'side') {
    const hand = step === 1 ? 19 : step === 2 ? 13 : 16
    return [{ from: [16, 28], to: [hand, 34], w: 3 }]
  }
  const swing = (i) => (step === 0 ? 0 : step === i + 1 ? -1 : 1)
  return [
    { from: [9, 28], to: [9, 34 + swing(0)], w: 2 },
    { from: [21, 28], to: [21, 34 + swing(1)], w: 2 },
  ]
}

const TORSO = { down: [11, 10], up: [11, 10], side: [12, 8] } // [левый край, ширина]

/** Пиксели ног выше ботинок: fn(x, y, leg, i) — i номер колонки внутри ноги. */
function eachLeg(dir, step, fn) {
  for (const leg of legs(dir, step))
    for (let y = HIP; y <= leg.bottom; y++) for (let i = 0; i < leg.w; i++) fn(leg.x(y) + i, y, leg, i)
}

/** Пиксели руки (рукав и кисть): fn(x, y, t) — t от плеча (0) до кисти (1). */
function eachArm(dir, step, fn) {
  for (const arm of arms(dir, step)) {
    const [x0, y0] = arm.from
    const [x1, y1] = arm.to
    const n = Math.max(1, y1 - y0)
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n)
      for (let i = 0; i < arm.w; i++) fn(x + i, y0 + k, k / n, i, arm.w)
    }
  }
}

// --- Тело -------------------------------------------------------------------------------

/** Тон ноги/руки: передняя — основной, задняя — в тени; у правого края — тень. */
const limbTone = (back, i, w) => (back ? M.shade : i === w - 1 ? M.shade : i === 0 ? M.light : M.base)

function body(dir, step) {
  const s = frame()
  const skin = frame()
  const [tx, tw] = TORSO[dir]
  skin.rect(tx, 26, tw, 11, M.base)
  eachLeg(dir, step, (x, y, leg, i) => skin.px(x, y, limbTone(leg.back !== !!leg.swap, i, leg.w)))
  eachArm(dir, step, (x, y, t, i, w) => skin.px(x, y, i === w - 1 ? M.shade : M.base))
  // голова: плоские тона, свет сверху-слева
  skin.shadedEllipse(16, 19, 7.5, 7, MASK_RAMP, { bias: -0.04 })
  if (dir === 'side') {
    skin.px(24, 21, M.base) // кончик носа
    skin.px(24, 22, M.shade)
  }
  skin.outline(INK)

  // ботинки — свой тёмный цвет
  const boots = frame()
  for (const leg of legs(dir, step)) {
    const x = leg.x(leg.bottom)
    const back = leg.back !== !!leg.swap
    const ramp = back ? R.wood.slice(0, 3) : R.wood.slice(1, 4)
    for (let y = leg.bottom + 1; y <= leg.bottom + 4; y++) {
      const left = x - (y > leg.bottom + 1 ? 1 : 0) + (leg.toe ? 0 : 0)
      const right = x + leg.w - 1 + (leg.toe ? 2 : y > leg.bottom + 1 ? 1 : 0)
      for (let px = left; px <= right; px++) boots.px(px, y, y === leg.bottom + 4 ? ramp[0] : px === left ? ramp[2] : ramp[1])
    }
  }
  boots.outline(INK)

  s.shadow(16, 46, 9, 1.6)
  s.stamp(boots)
  s.stamp(skin)
  // лицо: глаза-точки, румянец, крошечный рот
  if (dir === 'down') {
    for (const ex of [13, 19]) s.rect(ex, 20, 1, 2, INK)
    s.rect(11, 23, 2, 1, M.blush)
    s.rect(20, 23, 2, 1, M.blush)
    s.px(16, 23, M.deep)
  } else if (dir === 'side') {
    s.rect(20, 20, 1, 2, INK)
    s.rect(21, 23, 2, 1, M.blush)
    s.rect(13, 20, 1, 2, M.shade) // ухо
  }
  return s
}

// --- Одежда ---------------------------------------------------------------------------------

const creamTone = (i, w) => R.cream[i === w - 1 ? 1 : i === 0 ? 3 : 2]

function outfit(style, dir, step) {
  const s = frame()
  const [tx, tw] = TORSO[dir]
  const torsoTone = (x) => (x === tx ? M.light : x >= tx + tw - 2 ? M.shade : M.base)

  if (style === 'overalls') {
    // светлая рубашка с короткими рукавами, поверх — комбинезон на лямках
    for (let y = 26; y < 37; y++) for (let x = tx; x < tx + tw; x++) s.px(x, y, creamTone(x - tx, tw))
    eachArm(dir, step, (x, y, t, i, w) => t < 0.45 && s.px(x, y, creamTone(i, w)))
    const bib = dir === 'side' ? [16, 4] : [13, 6]
    for (let y = 30; y < 37; y++) for (let x = bib[0]; x < bib[0] + bib[1]; x++) s.px(x, y, torsoTone(x))
    if (dir !== 'side') {
      s.rect(12, 26, 1, 4, M.base)
      s.rect(19, 26, 1, 4, M.shade)
      if (dir === 'down') {
        s.rect(15, 32, 2, 2, M.shade) // карман
        s.px(13, 30, R.lamp[3])
        s.px(18, 30, R.lamp[3])
      }
    } else s.rect(16, 26, 1, 4, M.base)
    for (let x = tx; x < tx + tw; x++) s.px(x, 36, M.deep) // пояс
    eachLeg(dir, step, (x, y, leg, i) => s.px(x, y, limbTone(leg.back !== !!leg.swap, i, leg.w)))
  } else if (style === 'sweater') {
    // вязаный свитер: рубчик через строку, длинные рукава, тёмные штаны
    for (let y = 26; y < 37; y++)
      for (let x = tx; x < tx + tw; x++) s.px(x, y, y % 3 === 0 && x % 2 === 0 ? M.shade : torsoTone(x))
    for (let x = tx; x < tx + tw; x++) s.px(x, 36, M.deep)
    if (dir === 'down') s.rect(14, 26, 4, 1, M.light) // ворот
    eachArm(dir, step, (x, y, t, i, w) => s.px(x, y, t > 0.85 ? M.deep : i === w - 1 ? M.shade : M.base))
    eachLeg(dir, step, (x, y, leg, i) => s.px(x, y, R.oldWood[leg.back !== !!leg.swap ? 1 : i === leg.w - 1 ? 2 : 3]))
  } else {
    // сарафан поверх рубашки: колокол юбки до колен
    eachArm(dir, step, (x, y, t, i, w) => t < 0.45 && s.px(x, y, creamTone(i, w)))
    for (let y = 26; y < 32; y++) for (let x = tx; x < tx + tw; x++) s.px(x, y, torsoTone(x))
    for (let y = 32; y < 40; y++) {
      const grow = Math.floor((y - 32) / 2)
      const left = tx - grow
      const right = tx + tw - 1 + grow
      for (let x = left; x <= right; x++) {
        const fold = (x - left) % 4 === 3
        s.px(x, y, y === 39 ? M.deep : fold ? M.shade : x <= left + 1 ? M.light : x >= right - 1 ? M.shade : M.base)
      }
    }
    for (let x = tx; x < tx + tw; x++) s.px(x, 31, M.deep) // пояс
  }
  s.outline(INK)
  return s
}

// --- Волосы ---------------------------------------------------------------------------------

/** Прядь: вертикальная полоска маской волос, тень у правого края. */
function lock(s, x, top, bottom, w = 2) {
  for (let y = top; y <= bottom; y++) for (let i = 0; i < w; i++) s.px(x + i, y, i === w - 1 && w > 1 ? M.shade : M.base)
}

/** Сколько свисают пряди у лица и сзади, по причёске. */
const LENGTH = { short: 21, bob: 25, long: 33, braid: 22, bun: 21, curly: 24 }

function hairFront(style, dir) {
  const s = frame()
  const len = LENGTH[style]
  if (dir === 'up') {
    // спиной: волосы закрывают всю голову, длинные спускаются по спине
    s.shadedEllipse(16, 18.5, 8.6, 7.9, MASK_RAMP, { bias: -0.05 })
    if (style === 'bob') s.shadedEllipse(16, 21, 9, 6.5, MASK_RAMP, { bias: -0.1 })
    if (style === 'long') for (let y = 22; y <= len; y++) for (let x = 9; x < 24; x++) s.px(x, y, x < 11 ? M.base : x > 21 ? M.deep : M.shade)
    if (style === 'braid') for (let k = 0; k < 5; k++) s.shadedEllipse(16, 27 + k * 2.2, 2, 1.4, MASK_RAMP)
  } else if (dir === 'down') {
    s.shadedEllipse(16, 17, 8.6, 6.8, MASK_RAMP, { clip: (x, y) => y <= 17, bias: 0.05 })
    // чёлка зубцами: её контур кончается на 18-й строке, между ним и глазами (20-я) — строка кожи
    for (const [x, bottom] of [[10, 18], [12, 17], [14, 17], [17, 17], [19, 17], [21, 18]]) lock(s, x, 17, bottom)
    // пряди у лица симметричны относительно 16-го столбца, контур не задевает глаза и румянец
    lock(s, 8, 16, len)
    lock(s, 23, 16, len)
    if (style === 'braid') {
      for (let k = 0; k < 5; k++) s.shadedEllipse(23.5 - (k % 2), 24 + k * 2.2, 1.8, 1.3, MASK_RAMP)
      s.rect(22, 34, 3, 1, R.berry[3])
    }
  } else {
    // вбок (вправо): волосы на затылке и макушке, впереди — короткая прядь
    s.shadedEllipse(15, 17, 8.6, 6.8, MASK_RAMP, { clip: (x, y) => y <= 17, bias: 0.05 })
    // затылок — округлый, ниже у длинных причёсок
    const nape = Math.min(len, 26)
    s.shadedEllipse(11.5, (16 + nape) / 2, 4.6, (nape - 13) / 2, MASK_RAMP, { clip: (x) => x <= 14 })
    if (style === 'long') for (let y = 24; y <= len; y++) for (let x = 8; x < 13; x++) s.px(x, y, x > 10 ? M.shade : M.base)
    if (style === 'braid') {
      for (let k = 0; k < 5; k++) s.shadedEllipse(10 - (k % 2), 25 + k * 2.2, 1.8, 1.3, MASK_RAMP)
      s.rect(8, 35, 3, 1, R.berry[3])
    }
    lock(s, 20, 17, 17, 3)
  }
  if (style === 'bun') s.shadedEllipse(dir === 'side' ? 12 : 16, 10, 4, 3.5, MASK_RAMP)
  if (style === 'curly') {
    const puffs = dir === 'side' ? [[9, 14], [13, 11], [18, 11], [8, 20], [10, 24]] : [[9, 14], [13, 11], [19, 11], [23, 14], [8, 20], [24, 20]]
    for (const [x, y] of puffs) s.shadedEllipse(x, y, 3.2, 3, MASK_RAMP)
  }
  // блик на макушке — короткая дуга
  if (dir !== 'up') for (let x = 11; x < 16; x++) s.px(x, 12 + (x === 11 || x === 15 ? 1 : 0), M.light)
  s.outline(INK)
  return s
}

/** Задний слой волос — за головой и спиной (виден, когда персонаж смотрит на зрителя). */
function hairBack(style) {
  const s = frame()
  if (style === 'long') {
    s.shadedEllipse(16, 20, 9.5, 8.5, MASK_RAMP, { bias: -0.2 })
    for (let y = 24; y <= 35; y++) for (let x = 8; x < 25; x++) s.px(x, y, x < 10 ? M.shade : M.deep)
  } else if (style === 'bob') {
    s.shadedEllipse(16, 20, 9.5, 7.5, MASK_RAMP, { bias: -0.2 })
  } else if (style === 'curly') {
    s.shadedEllipse(16, 19, 10.5, 9, MASK_RAMP, { bias: -0.2 })
  } else {
    return null
  }
  s.outline(INK)
  return s
}

// --- Мелочи --------------------------------------------------------------------------------

function accessory(kind, dir) {
  const s = frame()
  if (kind === 'gardener_hat') {
    // высокая остроконечная соломенная шляпа с заломом кончика
    s.shadedEllipse(16, 14, 12.5, 2.6, R.straw.slice(1), { bias: 0.05 })
    const lean = dir === 'side' ? -1 : 1
    for (let t = 0; t <= 1.0001; t += 0.025) {
      const bend = t > 0.7 ? (t - 0.7) * 10 : 0
      const cx = 16 + lean * (2 * t + bend * 1.3)
      const cy = 12 - 10 * t + bend * 0.8
      const rad = 6 * (1 - t) + 1
      s.shadedEllipse(cx, cy, rad, rad * 0.8, R.straw.slice(1), { bias: 0.1 })
    }
    for (let x = 10; x < 23; x++) s.px(x, 12, R.rust[3]) // лента
    for (let y = 3; y < 16; y += 2) for (let x = 2; x < 30; x++) if ((x + y) % 4 === 0 && s.filled(x, y)) s.px(x, y, R.straw[2])
  } else if (kind === 'straw_hat') {
    s.shadedEllipse(16, 14, 11.5, 2.4, R.straw.slice(1), { bias: 0.05 })
    s.shadedEllipse(16, 10, 6.5, 4.5, R.straw.slice(1), { clip: (x, y) => y <= 13 })
    for (let x = 10; x < 23; x++) if (s.filled(x, 12)) s.px(x, 12, R.berry[3])
  } else if (kind === 'scarf') {
    const [tx, tw] = TORSO[dir]
    for (let y = 25; y < 28; y++) for (let x = tx; x < tx + tw; x++) s.px(x, y, R.berry[y === 25 ? 4 : x >= tx + tw - 2 ? 2 : 3])
    const tail = dir === 'side' ? 10 : dir === 'up' ? 15 : 18
    for (let y = 28; y < 32; y++) s.rect(tail, y, 2, 1, (y - 28) % 3 === 2 ? R.bone[2] : R.berry[2])
  } else if (kind === 'glasses') {
    if (dir === 'up') return null
    const rims = dir === 'side' ? [18] : [11, 17]
    for (const x of rims) {
      s.rect(x, 19, 5, 1, INK)
      s.rect(x, 22, 5, 1, INK)
      s.rect(x, 19, 1, 4, INK)
      s.rect(x + 4, 19, 1, 4, INK)
    }
    if (dir === 'down') s.px(16, 20, INK)
    else s.rect(14, 20, 4, 1, INK)
    return s
  } else if (kind === 'flower') {
    const [x, y] = dir === 'up' ? [20, 13] : dir === 'side' ? [11, 13] : [10, 14]
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) s.px(x + dx, y + dy, R.bone[3])
    s.px(x, y, R.lamp[3])
  } else {
    return null
  }
  s.outline(INK)
  return s
}

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
  const frames = { npc_vereshk: vereshk() }
  for (const dir of DIRECTIONS) {
    for (const step of STEPS) {
      frames[`char_body_${dir}_${step}`] = body(dir, step)
      for (const k of ['overalls', 'sweater', 'dress']) frames[`char_outfit_${k}_${dir}_${step}`] = outfit(k, dir, step)
    }
    for (const k of ['short', 'bob', 'long', 'braid', 'bun', 'curly']) frames[`char_hair_${k}_${dir}`] = hairFront(k, dir)
    for (const k of ['gardener_hat', 'straw_hat', 'scarf', 'glasses', 'flower']) {
      const acc = accessory(k, dir)
      if (acc) frames[`char_acc_${k}_${dir}`] = acc
    }
  }
  // задний слой волос нужен, только когда персонаж смотрит на зрителя
  for (const k of ['short', 'bob', 'long', 'braid', 'bun', 'curly']) {
    const back = hairBack(k)
    if (back) frames[`char_hairback_${k}_down`] = back
  }
  return frames
}

export { P }
