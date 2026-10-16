// Постройки и предметы в духе Inscryption: бревенчатый сарай со светящимися окном и дверью,
// инструменты, бочка, тачка, сине-зелёные валуны, каменная чаша. Плоские тона, шахматка, чёрный контур.

import { checker, noise, pick, rng, Sprite } from './canvas.mjs'
import { T, tuft } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

/** Тёплый свет изнутри: ровный оранжевый проём, светлее в середине, тень у верха и левого края. */
function glow(s, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const inner = x > x0 + 2 && x < x0 + w - 3 && y > y0 + 3 && y < y0 + h - 2
      const edge = x === x0 || y === y0
      const near = x <= x0 + 1 || y <= y0 + 1
      s.px(x, y, edge ? R.lamp[1] : near ? (checker(x, y) ? R.lamp[2] : R.lamp[1]) : inner ? R.lamp[4] : R.lamp[3])
    }
}

/** Старый сарай 4×3 клетки: бревенчатые стены со щелями, ржавая крыша с дырой, свет в окне и двери. */
export function shed() {
  const W = 4 * T
  const H = 3 * T
  const s = new Sprite(W, H)
  const r = rng(42)
  const body = new Sprite(W, H)

  // стены: горизонтальные доски по 4 пикселя, между ними тёмная щель
  const wallTop = 40
  const wallBottom = H - 7
  for (let y = wallTop; y < wallBottom; y++) {
    const row = Math.floor((y - wallTop) / 4)
    const inRow = (y - wallTop) % 4
    for (let x = 6; x < W - 6; x++) {
      const tone = inRow === 3 ? 0 : inRow === 0 ? 4 : noise(x, row, 6, 3, 1e9) > 0.7 ? 2 : 3
      body.px(x, y, R.wood[tone])
    }
    // торцы брёвен по краям
    if (inRow !== 3) {
      body.rect(4, y, 3, 1, R.wood[inRow === 0 ? 5 : 3])
      body.rect(W - 7, y, 3, 1, R.wood[inRow === 0 ? 4 : 2])
    }
  }
  // чёрные щели между досками, как у хижины на референсе
  for (let i = 0; i < 9; i++) {
    const y = wallTop + 4 * Math.floor(r() * 11) + 1
    const x = 8 + Math.floor(r() * (W - 30))
    body.rect(x, y, 6 + Math.floor(r() * 10), 2, P.dark)
  }
  // низ стены темнее: сырость
  for (let y = wallBottom - 4; y < wallBottom; y++) for (let x = 6; x < W - 6; x++) if (checker(x, y)) body.px(x, y, R.wood[1])

  // окно: тёплый свет за тёмной решёткой
  body.rect(14, 52, 30, 22, R.wood[1])
  glow(body, 16, 54, 26, 18)
  for (let x = 16; x < 42; x += 5) body.rect(x, 54, 1, 18, R.wood[0])
  for (let y = 54; y < 72; y += 6) body.rect(16, y, 26, 1, R.wood[0])
  body.rect(13, 74, 32, 2, R.wood[4])

  // дверной проём: внутри горит лампа, створка висит на одной петле
  body.rect(70, 50, 26, wallBottom - 50, R.wood[1])
  glow(body, 72, 52, 22, wallBottom - 52)
  for (let y = 52; y < wallBottom; y++)
    for (let x = 95; x < 104; x++) body.px(x, y + Math.floor((x - 95) / 3), R.wood[x === 95 ? 4 : x === 103 ? 1 : (y + x) % 5 ? 3 : 2])
  body.rect(97, 62, 3, 2, R.stone[3])

  // крыша: ржавая гофра, волны вертикальными полосами, у конька светлее
  const roofTop = 6
  const roofBottom = wallTop + 4
  for (let y = roofTop; y < roofBottom; y++)
    for (let x = 0; x < W; x++) {
      const wave = x % 4
      const depth = (y - roofTop) / (roofBottom - roofTop)
      const tone = (wave === 1 ? 3 : wave === 0 ? 1 : 2) - (depth > 0.66 ? 1 : 0)
      body.px(x, y, R.rust[Math.max(0, tone)])
    }
  // подтёки ржавчины: тёмные полосы вниз по волнам, края — шахматкой
  for (let i = 0; i < 14; i++) {
    const x = 2 + Math.floor(r() * (W / 4 - 1)) * 4 + 2
    const y0 = 8 + Math.floor(r() * 16)
    const len = 6 + Math.floor(r() * 16)
    for (let y = y0; y < Math.min(roofBottom - 2, y0 + len); y++) {
      body.px(x, y, R.rust[0])
      if (checker(x + 1, y)) body.px(x + 1, y, R.rust[1])
    }
  }
  body.ellipse(92, 18, 6, 3.5, P.dark) // дыра
  body.line(85, 15, 99, 15, R.rust[4])
  for (let x = 0; x < W; x++) {
    body.px(x, roofTop, R.rust[4])
    body.px(x, roofBottom - 1, R.rust[0])
    body.px(x, roofBottom, P.dark)
  }
  // труба
  for (let y = 0; y < 12; y++) for (let x = 104; x < 112; x++) body.px(x, y, R.stone[x === 104 ? 4 : x === 111 ? 1 : 2])
  body.rect(103, 0, 10, 2, R.stone[3])
  // фундамент: сине-зелёные камни
  for (let x = 4; x < W - 6; x += 8) body.shadedEllipse(x + 4, wallBottom + 3, 4.5, 3, R.stone.slice(1))
  body.outline(INK)

  // лестница, приставленная слева
  const ladder = new Sprite(W, H)
  for (let y = 30; y < H - 6; y++) {
    ladder.px(2 + Math.floor((y - 30) / 14), y, R.wood[4])
    ladder.px(9 + Math.floor((y - 30) / 14), y, R.wood[2])
  }
  for (let y = 34; y < H - 8; y += 7) ladder.line(3 + Math.floor((y - 30) / 14), y, 9 + Math.floor((y - 30) / 14), y, R.wood[3])
  ladder.outline(INK)

  s.shadow(W / 2 + 6, H - 4, W / 2, 6)
  s.stamp(body)
  s.stamp(ladder)
  for (let i = 0; i < 5; i++) tuft(s, 14 + r() * (W - 28), H - 3, r, R.weed, 1)
  return s
}

export function tools() {
  const s = new Sprite(2 * T, T)
  const t = new Sprite(2 * T, T)
  const handle = (x, y0, y1) => {
    for (let y = y0; y < y1; y++) {
      t.px(x, y, R.wood[4])
      t.px(x + 1, y, R.wood[2])
    }
  }
  // лопата
  handle(10, 2, 20)
  t.rect(7, 1, 7, 2, R.wood[2])
  for (let y = 20; y < 30; y++)
    for (let x = 7; x < 15; x++) if (!(y > 27 && (x === 7 || x === 14))) t.px(x, y, pick(R.silver.slice(0, 4), 0.8 - (x - 7) / 12, x, y))
  t.rect(9, 23, 3, 4, R.rust[3])
  // ржавая лопатка
  handle(24, 4, 21)
  for (let y = 21; y < 30; y++) for (let x = 21; x < 28; x++) t.px(x, y, pick(R.rust.slice(1), 0.9 - (x - 21) / 10, x, y))
  // грабли
  handle(41, 2, 23)
  t.rect(34, 23, 16, 2, R.silver[2])
  t.rect(34, 24, 16, 1, R.silver[0])
  for (let x = 34; x < 50; x += 3) t.rect(x, 25, 1, 4, R.silver[1])
  t.outline(INK)
  s.stamp(t)
  return s
}

/** Инструменты сняты: на заборе пустые гвозди и светлые пятна там, где висели ручки. */
export function toolsTaken() {
  const s = new Sprite(2 * T, T)
  for (const [x, top, bottom] of [[10, 3, 26], [24, 5, 26], [41, 3, 26]]) {
    for (let y = top; y < bottom; y++) if (checker(x, y)) s.px(x, y, R.oldWood[4], 160)
    s.px(x, top, R.silver[3])
    s.px(x, top + 1, R.silver[0])
  }
  return s
}

export function barrel() {
  const s = new Sprite(T, T)
  s.shadow(17, 29, 11, 2.5)
  const b = new Sprite(T, T)
  for (let y = 7; y < 29; y++)
    for (let x = 7; x < 25; x++) {
      const bulge = Math.abs(y - 18) > 8 ? 1 : 0
      if (x < 7 + bulge || x > 24 - bulge) continue
      const lit = 1 - (x - 7) / 17
      b.px(x, y, pick(R.wood.slice(1, 5), lit * 0.95, x, y))
    }
  for (let x = 10; x < 24; x += 4) for (let y = 8; y < 28; y++) b.px(x, y, R.wood[1]) // клёпки
  for (const y of [11, 23]) for (let x = 7; x < 25; x++) b.px(x, y, pick(R.stone.slice(0, 4), 0.9 - (x - 7) / 18, x, y))
  b.ellipse(16, 7, 8, 2.5, R.wood[2])
  b.ellipse(16, 7.5, 6.5, 1.5, P.dark)
  b.px(14, 7, R.leaf[2])
  b.px(17, 7, R.straw[2])
  b.outline(INK)
  s.stamp(b)
  return s
}

/** Тачка. Сломана — завалилась набок, колесо соскочило и лежит рядом; починена — стоит ровно, колесо на оси. */
export function wheelbarrow(repaired) {
  const s = new Sprite(T, T)
  s.shadow(16, 28, 13, 2.5)
  const w = new Sprite(T, T)
  // наклон кузова: у сломанной тачки нос уткнулся в землю
  const tilt = repaired ? 0 : 0.35
  for (let y = 10; y < 21; y++)
    for (let x = 3 + (y - 10) / 3; x < 26 - (y - 10) / 4; x++) {
      const yy = Math.round(y + (x - 14) * tilt * 0.4)
      w.px(x, yy, pick(R.rust.slice(1), 1 - (y - 10) / 11, Math.floor(x), y))
    }
  w.rect(6, 12, 17, 5, R.soil[2])
  w.rect(6, 12, 17, 1, R.soil[4])
  w.line(24, 13, 31, repaired ? 11 : 17, R.wood[4])
  w.line(24, 14, 31, repaired ? 12 : 18, R.wood[2])
  w.rect(21, 20, 2, repaired ? 6 : 5, R.wood[2])
  w.outline(INK)
  s.stamp(w)
  const wheel = new Sprite(T, T)
  if (repaired) {
    wheel.shadedEllipse(9, 23, 4.5, 4.5, R.oldWood.slice(1))
    wheel.ellipse(9, 23, 1.5, 1.5, R.silver[3])
  } else {
    // колесо лежит плашмя в траве
    wheel.shadedEllipse(6, 27, 4.5, 2, R.oldWood.slice(1))
    wheel.ellipse(6, 27, 1.5, 0.8, R.silver[1])
  }
  wheel.outline(INK)
  s.stamp(wheel)
  return s
}

/** Груда сине-зелёных валунов, как у дороги на референсе. */
export function rock() {
  const s = new Sprite(T, T)
  s.shadow(16, 27, 13, 3)
  const st = new Sprite(T, T)
  st.shadedEllipse(11, 21, 8, 6, R.stone.slice(1))
  st.shadedEllipse(23, 23, 6, 4.5, R.stone.slice(1), { bias: -0.08 })
  st.shadedEllipse(18, 15, 6, 4.5, R.stone.slice(1), { bias: 0.08 })
  st.outline(INK)
  // тёмные швы между валунами
  st.line(16, 18, 16, 25, R.stone[0])
  st.line(17, 19, 22, 19, R.stone[0])
  s.stamp(st)
  return s
}

/** Каменная чаша: спит — сухой мох и трещина; пробуждена — светящиеся цветы. */
export function basin(awakened) {
  const s = new Sprite(T, T)
  const r = rng(awakened ? 811 : 810)
  s.shadow(17, 29, 11, 2.5)
  const st = new Sprite(T, T)
  for (let y = 20; y < 28; y++) for (let x = 12; x < 21; x++) st.px(x, y, pick(R.stone.slice(1, 5), 1 - (x - 12) / 10, x, y))
  st.rect(10, 26, 13, 2, R.stone[2])
  st.shadedEllipse(16, 15, 12, 6.5, R.stone.slice(1))
  st.ellipse(16, 14, 9.5, 4, awakened ? R.dew[1] : R.soil[1])
  for (const x of [7, 12, 20, 25]) st.px(x, 17, R.stone[5]) // знаки-листья
  st.outline(INK)
  s.stamp(st)
  if (!awakened) {
    for (let i = 0; i < 22; i++) s.px(8 + r() * 16, 11 + r() * 5, r() > 0.5 ? R.weed[2] : R.grass[2])
    s.line(20, 15, 21, 21, INK)
    return s
  }
  // вода светится изнутри
  for (let y = 11; y < 18; y++)
    for (let x = 8; x < 25; x++) if (((x - 16) / 9) ** 2 + ((y - 14) / 3.5) ** 2 < 1) s.px(x, y, pick(R.dew.slice(1), 1 - Math.abs(x - 16) / 10, x, y))
  const flowers = new Sprite(T, T)
  for (const [x, y] of [[10, 12], [22, 12], [16, 9]]) flowers.shadedEllipse(x, y, 2.5, 2, R.leaf.slice(1))
  for (const [x, y, c] of [[12, 8, '#9a7cc8'], [20, 7, '#9a7cc8'], [16, 4, '#d4c4f0'], [8, 10, '#7a5cb0'], [24, 10, '#7a5cb0']]) {
    flowers.rect(x - 1, y - 1, 3, 3, c)
    flowers.px(x, y - 1, P.white)
  }
  flowers.outline(INK)
  s.stamp(flowers)
  return s
}

export function propFrames() {
  return {
    prop_shed: shed(),
    prop_tools: tools(),
    prop_barrel: barrel(),
    prop_wheelbarrow: wheelbarrow(false),
    prop_wheelbarrow_awakened: wheelbarrow(true),
    prop_tools_searched: toolsTaken(),
    prop_rock: rock(),
    prop_basin: basin(false),
    prop_basin_awakened: basin(true),
  }
}
