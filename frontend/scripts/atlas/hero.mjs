// Главный герой по листу персонажа (docs/ART_DIRECTION.md): чиби с крупной головой и объёмными
// лохматыми волосами, большие глаза с бликом, маленькое тело, широкие штаны и массивная обувь.
// Базовый образ — оливковая куртка поверх кремового худи, тёмные карго, белые кроссовки, рюкзак с клевером.
//
// Кадр 32×48, низ — земля. Направления: down (к зрителю), up (спиной), side (вправо; влево — отражение).
// Шаг: 0 — стоит, 1 и 2 — шаг левой и правой. Слои, которые красит игрок, рисуются маркерными цветами
// (src/game/character.ts перекрашивает deep → shade → base → light в выбранный цвет).

import { Sprite } from './canvas.mjs'
import { INK, P, R } from './palette.mjs'

export const CW = 32
export const CH = 48
export const DIRECTIONS = ['down', 'up', 'side']
export const STEPS = [0, 1, 2]

const M = { deep: '#400040', shade: '#800080', base: '#ff00ff', light: '#ff80ff', blush: '#ff0080' }
const MASK = [M.deep, M.shade, M.base, M.light]

// Постоянные цвета (не перекрашиваются): худи, тёмные штаны, джинсы, чёрная кожа, кроссовки
const HOODIE = R.cream
const DARK = ['#151316', '#211e22', '#2e2a30', '#3d3840']
const JEANS = ['#232d3a', '#344255', '#4a5b72', '#66799a']
const LEATHER = ['#0f0d10', '#1b181c', '#29252b', '#3a353c']
const SNEAKER = ['#7d776d', '#b9b2a4', '#e3ddcf', '#f6f1e6']
const BOOT = R.wood.slice(0, 4)

const frame = () => new Sprite(CW, CH)

// --- Поза ---------------------------------------------------------------------------------

const HIP = 35
const FOOT = 40

/** Ноги: x(y) левого края, ширина, нижняя строка; сбоку — ножницами, спереди — приподнятая нога. */
function legs(dir, step) {
  if (dir === 'side') {
    if (step === 0) return [{ x: () => 14, w: 5, bottom: FOOT, back: false }]
    const spread = (y) => Math.round((y - HIP) * 0.8)
    return [
      { x: (y) => 14 - spread(y), w: 3, bottom: FOOT, back: step !== 2 },
      { x: (y) => 16 + spread(y), w: 3, bottom: FOOT, back: step === 2 },
    ]
  }
  const lift = (i) => (step === i + 1 ? 1 : 0)
  return [
    { x: () => 11, w: 4, bottom: FOOT - lift(0), back: false },
    { x: () => 17, w: 4, bottom: FOOT - lift(1), back: false },
  ]
}

/** Руки: плечо → кисть. Сбоку рука качается в такт шагу. */
function arms(dir, step) {
  if (dir === 'side') {
    const hand = step === 1 ? 18 : step === 2 ? 12 : 15
    return [{ from: [15, 27], to: [hand, 33], w: 3 }]
  }
  const swing = (i) => (step === 0 ? 0 : step === i + 1 ? -1 : 1)
  return [
    { from: [8, 27], to: [8, 33 + swing(0)], w: 3 },
    { from: [21, 27], to: [21, 33 + swing(1)], w: 3 },
  ]
}

/** Туловище: [левый край, ширина], строки 26..34. */
const TORSO = { down: [11, 10], up: [11, 10], side: [12, 7] }

function eachLeg(dir, step, fn) {
  for (const leg of legs(dir, step))
    for (let y = HIP; y <= leg.bottom; y++) for (let i = 0; i < leg.w; i++) fn(leg.x(y) + i, y, leg, i)
}

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

/** Тон по положению в полосе: слева блик, справа тень — свет сверху-слева. */
const band = (ramp, i, w, back = false) => ramp[back ? 1 : i === 0 ? ramp.length - 1 : i === w - 1 ? 1 : ramp.length - 2]

// --- Тело ---------------------------------------------------------------------------------

/** Голова, шея, кисти и ноги (видны у платья) — маской кожи; лицо: большие глаза с бликом и румянец. */
function body(dir, step) {
  const s = frame()
  const skin = frame()
  eachLeg(dir, step, (x, y, leg, i) => skin.px(x, y, leg.back ? M.shade : band(MASK, i, leg.w)))
  eachArm(dir, step, (x, y, t, i, w) => t > 0.8 && skin.px(x, y, band(MASK, i, w)))
  // лицо — ровным основным тоном: блик по левому верхнему краю, тень — тонкой кромкой справа.
  // Объёмная заливка шаром дала бы тень по всему низу лица, а на светлой коже это выглядит как «борода».
  for (let y = 10; y <= 26; y++)
    for (let x = 7; x <= 25; x++) {
      const nx = (x - 16) / 8
      const ny = (y - 18) / 7.5
      const d = nx * nx + ny * ny
      if (d > 1) continue
      const edge = d > 0.72
      skin.px(x, y, edge && nx > 0.35 ? M.shade : edge && nx < -0.3 && ny < 0.2 ? M.light : M.base)
    }
  skin.outline(INK)
  s.shadow(16, 46, 9, 1.6)
  s.stamp(skin)
  const eye = (x) => {
    s.rect(x, 19, 2, 3, INK)
    s.px(x, 19, P.white)
    s.px(x + 1, 21, '#4a3226') // тёплая радужка внизу
  }
  if (dir === 'down') {
    eye(12)
    eye(18)
    s.rect(10, 22, 2, 1, M.blush)
    s.rect(20, 22, 2, 1, M.blush)
    s.px(15, 23, M.deep)
  } else if (dir === 'side') {
    eye(19)
    s.rect(21, 22, 2, 1, M.blush)
    s.px(23, 23, M.deep)
  }
  return s
}

// --- Обувь и штаны ------------------------------------------------------------------------

/** Массивная обувь: кроссовки (светлые, с подошвой), ботинки или тапочки. */
function shoes(s, dir, step, kind) {
  const ramp = kind === 'boots' ? BOOT : kind === 'slippers' ? HOODIE : SNEAKER
  for (const leg of legs(dir, step)) {
    const x = leg.x(leg.bottom)
    const top = leg.bottom + 1
    for (let y = top; y <= top + 4; y++) {
      const left = x - (y > top ? 1 : 0)
      const right = x + leg.w - 1 + (dir === 'side' ? 2 : y > top ? 1 : 0)
      for (let px = left; px <= right; px++) {
        const sole = y === top + 4
        s.px(px, y, sole ? (kind === 'sneakers' ? SNEAKER[0] : ramp[0]) : leg.back ? ramp[1] : px === left ? ramp[3] : ramp[2])
      }
    }
    if (kind === 'sneakers' && !leg.back) s.px(x + 1, top + 1, SNEAKER[0]) // шнурок
  }
}

/** Штаны по ногам: широкие, до обуви; карго — с карманом на бедре. */
function pants(s, dir, step, ramp, { cargo = false, stripe = null } = {}) {
  eachLeg(dir, step, (x, y, leg, i) => {
    const c = leg.back ? ramp[1] : band(ramp, i, leg.w)
    s.px(x, y, stripe && i === leg.w - 1 && dir !== 'up' ? stripe : c)
  })
  if (cargo && dir !== 'up') for (const leg of legs(dir, step)) if (!leg.back) s.rect(leg.x(HIP + 2) + (dir === 'side' ? 1 : 0), HIP + 2, 2, 2, ramp[0])
}

// --- Одежда -------------------------------------------------------------------------------

/** Худи под курткой: кремовая середина, капюшон вокруг шеи, шнурки. */
function hoodieUnder(s, dir) {
  if (dir === 'up') {
    // сзади — капюшон лежит на спине поверх куртки (рисуется позже, см. hoodOnBack)
    return
  }
  const [tx, tw] = TORSO[dir]
  const mid = dir === 'side' ? [tx + tw - 3, 3] : [14, 4]
  for (let y = 26; y < 34; y++) for (let x = mid[0]; x < mid[0] + mid[1]; x++) s.px(x, y, band(HOODIE, x - mid[0], mid[1]))
  // капюшон воротником
  for (let x = dir === 'side' ? 12 : 11; x < (dir === 'side' ? 19 : 21); x++) {
    s.px(x, 25, HOODIE[3])
    s.px(x, 26, HOODIE[2])
  }
  if (dir === 'down') {
    s.rect(14, 27, 1, 3, HOODIE[0]) // шнурки
    s.rect(17, 27, 1, 3, HOODIE[0])
  }
}

function hoodOnBack(s) {
  for (let y = 25; y < 30; y++) for (let x = 12 + Math.max(0, y - 27); x < 20 - Math.max(0, y - 27); x++) s.px(x, y, y === 25 ? HOODIE[3] : HOODIE[2])
  s.rect(15, 26, 2, 2, HOODIE[0])
}

/** Торс одним цветом с тенью у краёв (маска — красит игрок, или постоянный ramp). */
function torso(s, dir, ramp, top = 26, bottom = 34) {
  const [tx, tw] = TORSO[dir]
  for (let y = top; y < bottom; y++) for (let x = tx; x < tx + tw; x++) s.px(x, y, band(ramp, x - tx, tw))
}

/** Рукава: oversize — шире руки, до кисти; length — какая часть руки закрыта (1 — до запястья). */
function sleeves(s, dir, step, ramp, length = 0.82) {
  // свет слева: у левой руки светлый внешний край, у правой — тёмный; к телу рукав одного тона
  eachArm(dir, step, (x, y, t, i, w) => {
    if (t > length) return
    const outer = x < 16 ? i === 0 : i === w - 1
    s.px(x, y, outer ? (x < 16 ? ramp[ramp.length - 1] : ramp[1]) : ramp[ramp.length - 2])
  })
}

function outfit(style, dir, step) {
  const s = frame()
  const [tx, tw] = TORSO[dir]
  if (style === 'casual') {
    // куртка нараспашку поверх худи, карго, кроссовки
    torso(s, dir, MASK)
    hoodieUnder(s, dir)
    sleeves(s, dir, step, MASK)
    for (let x = tx; x < tx + tw; x++) s.px(x, 34, M.deep) // низ куртки
    if (dir === 'down') {
      s.rect(11, 30, 2, 1, M.deep) // клапаны карманов
      s.rect(19, 30, 2, 1, M.deep)
    }
    if (dir === 'up') hoodOnBack(s)
    pants(s, dir, step, DARK, { cargo: true })
    shoes(s, dir, step, 'sneakers')
  } else if (style === 'sport') {
    // худи цвета игрока, спортивные штаны с полосой
    torso(s, dir, MASK)
    sleeves(s, dir, step, MASK, 1)
    if (dir === 'down') {
      s.rect(13, 31, 6, 2, M.shade) // карман-кенгуру
      s.rect(14, 26, 1, 3, HOODIE[3])
      s.rect(17, 26, 1, 3, HOODIE[3])
    }
    if (dir === 'up') {
      for (let y = 25; y < 29; y++) s.rect(12, y, 8, 1, M.shade) // капюшон
    }
    pants(s, dir, step, DARK, { stripe: SNEAKER[3] })
    shoes(s, dir, step, 'sneakers')
  } else if (style === 'grunge') {
    // кожанка поверх футболки цвета игрока, рваные джинсы, ботинки
    torso(s, dir, MASK)
    const jacket = dir === 'side' ? [[tx, 3]] : [[11, 3], [18, 3]]
    if (dir === 'up') torso(s, dir, LEATHER)
    else for (const [x0, w] of jacket) for (let y = 26; y < 34; y++) for (let x = x0; x < x0 + w; x++) s.px(x, y, band(LEATHER, x - x0, w))
    sleeves(s, dir, step, LEATHER, 1)
    if (dir === 'down') s.px(16, 28, P.white) // кулон
    pants(s, dir, step, JEANS)
    if (dir !== 'up') for (const leg of legs(dir, step)) if (!leg.back) s.rect(leg.x(HIP + 3) + 1, HIP + 3, 2, 1, R.bone[3]) // дыры на коленях
    shoes(s, dir, step, 'boots')
  } else if (style === 'dress') {
    // платье в цветочек до колен, светлые носки, ботинки
    sleeves(s, dir, step, MASK, 0.5)
    for (let y = 26; y < 40; y++) {
      const grow = Math.max(0, Math.floor((y - 30) / 2))
      const left = tx - grow
      const right = tx + tw - 1 + grow
      for (let x = left; x <= right; x++) s.px(x, y, y === 39 ? M.deep : x <= left ? M.light : x >= right - 1 ? M.shade : M.base)
    }
    for (let y = 29; y < 39; y += 3) for (let x = tx - 2; x < tx + tw + 2; x += 4) if (s.filled(x + (y % 2), y)) s.px(x + (y % 2), y, R.bone[3]) // цветочки
    for (const leg of legs(dir, step)) for (let i = 0; i < leg.w; i++) s.px(leg.x(leg.bottom) + i, leg.bottom, R.bone[3]) // носки
    shoes(s, dir, step, 'boots')
  } else if (style === 'winter') {
    // пуховик со стёжкой и меховым воротником, тёмные штаны, ботинки
    for (let y = 26; y < 36; y++) for (let x = tx - 1; x < tx + tw + 1; x++) s.px(x, y, (y - 26) % 3 === 2 ? M.shade : band(MASK, x - tx + 1, tw + 2))
    sleeves(s, dir, step, MASK, 1)
    for (let x = tx - 1; x < tx + tw + 1; x++) {
      s.px(x, 25, HOODIE[3])
      s.px(x, 26, HOODIE[2])
    }
    pants(s, dir, step, DARK)
    shoes(s, dir, step, 'boots')
  } else if (style === 'sweater') {
    // домашний: свитер крупной вязки, клетчатые штаны, тапочки
    torso(s, dir, MASK)
    for (let y = 27; y < 34; y += 2) for (let x = tx; x < tx + tw; x += 2) s.px(x + (y % 4 ? 1 : 0), y, M.shade)
    sleeves(s, dir, step, MASK, 1)
    for (let x = tx; x < tx + tw; x++) s.px(x, 34, M.deep)
    eachLeg(dir, step, (x, y, leg, i) => s.px(x, y, (x + y) % 4 === 0 || y % 3 === 0 ? R.oldWood[2] : leg.back ? R.cream[1] : R.cream[i === 0 ? 3 : 2]))
    shoes(s, dir, step, 'slippers')
  } else {
    // комбинезон поверх светлой рубашки
    torso(s, dir, HOODIE)
    sleeves(s, dir, step, HOODIE, 0.5)
    const bib = dir === 'side' ? [15, 4] : [13, 6]
    for (let y = 29; y < 35; y++) for (let x = bib[0]; x < bib[0] + bib[1]; x++) s.px(x, y, band(MASK, x - bib[0], bib[1]))
    if (dir !== 'side') {
      s.rect(12, 26, 1, 4, M.base)
      s.rect(19, 26, 1, 4, M.shade)
    }
    pants(s, dir, step, MASK)
    shoes(s, dir, step, 'sneakers')
  }
  s.outline(INK)
  // контур воротника выше плеч лёг бы чертой поперёк подбородка — там одежду закрывает голова
  for (let y = 0; y <= 24; y++) for (let x = 0; x < CW; x++) s.clear(x, y)
  return s
}

// --- Волосы -------------------------------------------------------------------------------

/** Сколько свисают волосы у лица и сзади по причёске. */
const LENGTH = { bob: 26, short: 21, long: 32, braid: 23, bun: 22, gathered: 22, curly: 25 }

/** Прядь у лица: полоска маской волос с острым кончиком, тень у правого края. */
function lock(s, x, top, bottom, w = 2) {
  for (let y = top; y <= bottom; y++) for (let i = 0; i < w; i++) if (y < bottom || i === 0) s.px(x + i, y, i === w - 1 && w > 1 ? M.shade : M.base)
}

/** Хохолок-«антенна» и вихры: делают каре лохматым, как на листе персонажа. */
function flicks(s, dir) {
  const c = dir === 'side' ? 14 : 16
  s.px(c, 8, M.base)
  s.px(c + 1, 7, M.base)
  s.px(c + 2, 7, M.shade)
}

function hairFront(style, dir) {
  const s = frame()
  const len = LENGTH[style]
  if (style === 'bun') s.shadedEllipse(dir === 'side' ? 13 : 16, 7, 5, 4, MASK)
  if (style === 'gathered') s.shadedEllipse(dir === 'side' ? 10 : 16, dir === 'up' ? 24 : 9, 4, 3.5, MASK)
  if (dir === 'up') {
    // спиной: волосы закрывают всю голову
    s.shadedEllipse(16, 17, 9.5, 8.8, MASK, { bias: -0.05 })
    if (style === 'bob' || style === 'curly') {
      for (let y = 22; y <= len; y++) for (let x = 7; x < 26; x++) s.px(x, y, x < 9 ? M.base : x > 23 ? M.deep : M.shade)
      s.px(6, len, M.base) // вихры наружу
      s.px(26, len, M.shade)
    }
    if (style === 'long') for (let y = 22; y <= len + 6; y++) for (let x = 8; x < 25; x++) s.px(x, y, x < 10 ? M.base : x > 22 ? M.deep : M.shade)
    if (style === 'braid') for (let k = 0; k < 6; k++) s.shadedEllipse(16, 26 + k * 2, 2, 1.4, MASK)
    if (style === 'gathered') s.shadedEllipse(16, 24, 4, 3.5, MASK)
  } else if (dir === 'down') {
    s.shadedEllipse(16, 15.5, 9.5, 7.6, MASK, { clip: (x, y) => y <= 15, bias: 0.05 })
    // чёлка зубцами: над глазами кончается на 16-й строке, контур — на 17-й, между ним и глазами — строка кожи
    for (const [x, bottom] of [[8, 18], [10, 17], [12, 16], [14, 16], [16, 16], [18, 16], [20, 16], [22, 17]]) lock(s, x, 14, bottom)
    // пряди у лица: у каре — объёмные, с вихрами наружу внизу
    const w = ['bob', 'long', 'curly'].includes(style) ? 3 : 2
    lock(s, 7 - (w - 2), 14, len, w)
    lock(s, 23, 14, len, w)
    if (style === 'bob' || style === 'curly') {
      s.px(5, len - 1, M.base)
      s.px(26, len - 1, M.shade)
    }
    if (style === 'braid') {
      for (let k = 0; k < 6; k++) s.shadedEllipse(24 - (k % 2), 24 + k * 2, 1.8, 1.3, MASK)
      s.rect(22, 36, 3, 1, R.berry[3])
    }
  } else {
    // вбок (вправо): макушка, объёмный затылок, прядь у лица
    s.shadedEllipse(15, 15.5, 9.5, 7.6, MASK, { clip: (x, y) => y <= 15, bias: 0.05 })
    const nape = Math.min(len, 27)
    s.shadedEllipse(10.5, (15 + nape) / 2, 5, (nape - 12) / 2, MASK, { clip: (x) => x <= 14 })
    if (style === 'bob' || style === 'curly') s.px(5, nape - 1, M.base)
    if (style === 'long') for (let y = 25; y <= len + 4; y++) for (let x = 7; x < 13; x++) s.px(x, y, x > 10 ? M.shade : M.base)
    if (style === 'braid') {
      for (let k = 0; k < 5; k++) s.shadedEllipse(9 - (k % 2), 26 + k * 2, 1.8, 1.3, MASK)
      s.rect(7, 36, 3, 1, R.berry[3])
    }
    lock(s, 20, 14, 16, 3) // чёлка над глазом
  }
  if (style === 'curly') {
    const puffs = dir === 'side' ? [[8, 13], [12, 10], [18, 10], [7, 19], [8, 24]] : [[8, 13], [12, 10], [20, 10], [24, 13], [6, 19], [26, 19]]
    for (const [x, y] of puffs) s.shadedEllipse(x, y, 3.3, 3, MASK)
  }
  if (style !== 'bun' && style !== 'gathered' && dir !== 'up') flicks(s, dir)
  if (dir !== 'up') for (let x = 10; x < 15; x++) s.px(x, 11 + (x === 10 || x === 14 ? 1 : 0), M.light) // блик
  s.outline(INK)
  return s
}

/** Задний слой — за головой и спиной, виден, когда герой смотрит на зрителя. */
function hairBack(style) {
  const s = frame()
  if (style === 'long') {
    s.shadedEllipse(16, 19, 10, 8.5, MASK, { bias: -0.2 })
    for (let y = 22; y <= 38; y++) for (let x = 7; x < 26; x++) s.px(x, y, x < 9 ? M.shade : M.deep)
  } else if (style === 'bob' || style === 'curly') {
    s.shadedEllipse(16, 19, 10.5, 8.5, MASK, { bias: -0.2 })
    for (let y = 22; y <= 26; y++) for (let x = 6; x < 27; x++) s.px(x, y, M.deep)
  } else {
    return null
  }
  s.outline(INK)
  return s
}

// --- Мелочи -------------------------------------------------------------------------------

function accessory(kind, dir) {
  const s = frame()
  if (kind === 'leaf_clip') {
    // заколка-листик в волосах, как на листе персонажа
    const [x, y] = dir === 'up' ? [21, 13] : dir === 'side' ? [11, 13] : [10, 13]
    s.rect(x, y, 3, 2, R.leaf[4])
    s.px(x + 1, y, R.leaf[5])
    s.px(x + 3, y + 1, R.leaf[3])
    s.px(x - 1, y + 2, R.silver[3])
  } else if (kind === 'headphones') {
    for (let a = 0; a <= 16; a++) {
      const t = (a / 16) * Math.PI
      s.rect(Math.round(16 - Math.cos(t) * (dir === 'side' ? 6 : 10)), Math.round(15 - Math.sin(t) * 8), 2, 1, DARK[2])
    }
    const cups = dir === 'side' ? [[12, 16]] : dir === 'up' ? [[5, 16], [24, 16]] : [[4, 16], [25, 16]]
    for (const [x, y] of cups) {
      s.rect(x, y, 4, 6, DARK[3])
      s.rect(x, y, 1, 6, DARK[1])
    }
  } else if (kind === 'beanie') {
    s.shadedEllipse(16, 13, 10, 6.5, DARK, { clip: (x, y) => y <= 15 })
    for (let x = 6; x < 27; x += 2) for (let y = 8; y < 14; y++) if (s.filled(x, y)) s.px(x, y, DARK[1])
    s.rect(6, 14, 20, 3, DARK[3])
    if (dir === 'down') s.rect(13, 15, 4, 1, R.bone[2]) // нашивка
  } else if (kind === 'gardener_hat') {
    // шляпа садовника: широкие соломенные поля, невысокая тулья, плетение, зелёная лента и листик за ней
    s.shadedEllipse(16, 13, 13.5, 3, R.straw.slice(1), { bias: 0.05 })
    s.shadedEllipse(16, 9.5, 7, 4.8, R.straw.slice(1), { clip: (x, y) => y <= 12, bias: 0.1 })
    for (let y = 6; y < 15; y += 2) for (let x = 3; x < 30; x++) if ((x + y) % 4 === 0 && s.filled(x, y)) s.px(x, y, R.straw[2])
    for (let x = 9; x < 24; x++) if (s.filled(x, 11)) {
      s.px(x, 11, R.leaf[3])
      s.px(x, 12, R.leaf[2])
    }
    const leafAt = dir === 'side' ? 10 : 21
    s.rect(leafAt, 8, 3, 2, R.leaf[4])
    s.px(leafAt + (dir === 'side' ? -1 : 3), 7, R.leaf[5])
  } else if (kind === 'wizard_hat') {
    // шляпа колдуна: вересковый колпак с заломленной верхушкой, золотая лента, звёздочка и месяц
    const ramp = R.heather.slice(1)
    s.shadedEllipse(16, 13, 13, 2.8, ramp, { bias: 0.05 })
    const lean = dir === 'side' ? -1 : 1
    // колпак сужается кверху, а верхняя треть заламывается вбок и чуть свисает
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const bend = t > 0.5 ? (t - 0.5) * 2 : 0
      const r = 5.8 * (1 - t) + 0.7
      s.shadedEllipse(16 + lean * (bend * bend * 9), 11 - 10 * t + bend * bend * 4, r, r * 0.85, ramp, { bias: 0.1 })
    }
    for (let x = 9; x < 24; x++) if (s.filled(x, 11)) s.px(x, 11, R.lamp[3])
    if (dir !== 'up') {
      s.px(14, 7, R.lamp[5]) // звёздочка
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) s.px(14 + dx, 7 + dy, R.lamp[3])
      s.px(18, 4, R.bone[3]) // месяц
      s.px(19, 5, R.bone[3])
      s.px(18, 6, R.bone[2])
    }
  } else if (kind === 'straw_hat') {
    s.shadedEllipse(16, 13, 11.5, 2.4, R.straw.slice(1), { bias: 0.05 })
    s.shadedEllipse(16, 9, 6.5, 4.5, R.straw.slice(1), { clip: (x, y) => y <= 12 })
    for (let x = 10; x < 23; x++) if (s.filled(x, 11)) s.px(x, 11, R.berry[3])
  } else if (kind === 'scarf') {
    const [tx, tw] = TORSO[dir]
    for (let y = 24; y < 27; y++) for (let x = tx; x < tx + tw; x++) s.px(x, y, R.berry[y === 24 ? 4 : x >= tx + tw - 2 ? 2 : 3])
    const tail = dir === 'side' ? 10 : dir === 'up' ? 15 : 18
    for (let y = 27; y < 31; y++) s.rect(tail, y, 2, 1, (y - 27) % 3 === 2 ? R.bone[2] : R.berry[2])
  } else if (kind === 'glasses') {
    if (dir === 'up') return null
    const rims = dir === 'side' ? [18] : [11, 17]
    for (const x of rims) {
      s.rect(x, 18, 4, 1, INK)
      s.rect(x, 22, 4, 1, INK)
      s.rect(x - 1, 19, 1, 3, INK)
      s.rect(x + 4, 19, 1, 3, INK)
    }
    s.rect(dir === 'side' ? 15 : 15, 19, dir === 'side' ? 3 : 2, 1, INK)
    return s
  } else if (kind === 'flower') {
    const [x, y] = dir === 'up' ? [21, 12] : dir === 'side' ? [11, 12] : [9, 13]
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) s.px(x + dx, y + dy, R.bone[3])
    s.px(x, y, R.lamp[3])
  } else {
    return null
  }
  s.outline(INK)
  return s
}

// --- Сумка --------------------------------------------------------------------------------

/** Рюкзак с брелоком-клевером (спереди видны лямки) или холщовый шоппер на плече. */
function bag(kind, dir) {
  const s = frame()
  const pack = ['#1a1714', '#2a2420', '#3b332c', '#4e4439']
  if (kind === 'backpack') {
    if (dir === 'down') {
      s.rect(12, 26, 1, 8, pack[2])
      s.rect(19, 26, 1, 8, pack[1])
    } else if (dir === 'up') {
      for (let y = 26; y < 38; y++) for (let x = 10; x < 23; x++) s.px(x, y, band(pack, x - 10, 13))
      s.rect(10, 26, 13, 3, pack[3]) // клапан
      s.rect(13, 31, 7, 4, pack[1]) // карман
      s.rect(15, 29, 3, 1, R.silver[2]) // пряжка
      s.rect(20, 35, 2, 2, R.leaf[4]) // клевер на брелоке
      s.px(21, 37, R.leaf[3])
    } else {
      for (let y = 27; y < 37; y++) for (let x = 7; x < 12; x++) s.px(x, y, band(pack, x - 7, 5))
      s.line(12, 27, 17, 33, pack[2]) // лямка
      s.rect(7, 35, 2, 2, R.leaf[4])
    }
  } else if (kind === 'tote') {
    const side = dir === 'up' ? 6 : 22
    s.line(dir === 'up' ? 13 : 19, 26, side + 2, 31, R.cream[1])
    for (let y = 31; y < 39; y++) for (let x = side; x < side + 6; x++) s.px(x, y, band(R.cream, x - side, 6))
    s.px(side + 2, 34, R.leaf[3]) // листик на ткани
  } else {
    return null
  }
  s.outline(INK)
  return s
}

const HAIRS = ['bob', 'gathered', 'long', 'bun', 'braid', 'short', 'curly']
const OUTFITS = ['casual', 'sport', 'grunge', 'dress', 'winter', 'sweater', 'overalls']
const ACCESSORIES = ['leaf_clip', 'headphones', 'beanie', 'gardener_hat', 'wizard_hat', 'straw_hat', 'scarf', 'glasses', 'flower']
const BAGS = ['backpack', 'tote']

/** Все кадры героя: тело и одежда — по направлениям и фазам шага, волосы, мелочи и сумка — по направлениям. */
export function heroFrames() {
  const frames = {}
  for (const dir of DIRECTIONS) {
    for (const step of STEPS) {
      frames[`char_body_${dir}_${step}`] = body(dir, step)
      for (const k of OUTFITS) frames[`char_outfit_${k}_${dir}_${step}`] = outfit(k, dir, step)
    }
    for (const k of HAIRS) frames[`char_hair_${k}_${dir}`] = hairFront(k, dir)
    for (const k of ACCESSORIES) {
      const acc = accessory(k, dir)
      if (acc) frames[`char_acc_${k}_${dir}`] = acc
    }
    for (const k of BAGS) frames[`char_bag_${k}_${dir}`] = bag(k, dir)
  }
  for (const k of HAIRS) {
    const back = hairBack(k)
    if (back) frames[`char_hairback_${k}_down`] = back
  }
  return frames
}
