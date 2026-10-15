// Постройки и предметы: сарай, инструменты, бочка, тачка, камни, каменная чаша.

import { noise, pick, rng, Sprite } from './canvas.mjs'
import { grassFill, T, weedClump } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

/** Старый сарай 4×3 клетки: доски с волокнами, ржавая гофра, лестница, фундамент, мох. */
export function shed() {
  const W = 4 * T
  const H = 3 * T
  const s = new Sprite(W, H)
  const r = rng(42)
  const body = new Sprite(W, H)

  // стены: вертикальные доски, у каждой своя рампа-светотень
  const wallTop = 40
  const wallBottom = H - 8
  for (let x = 8; x < W - 8; x++) {
    const plank = Math.floor((x - 8) / 6)
    const inPlank = (x - 8) % 6
    for (let y = wallTop; y < wallBottom; y++) {
      const tone = inPlank === 0 ? 1 : inPlank === 5 ? 2 : 4 - (plank % 2) - (noise(x, y, 4, plank, 1e9) > 0.72 ? 1 : 0)
      body.px(x, y, R.oldWood[tone])
    }
    if (r() > 0.85) body.rect(x, wallTop + 6 + Math.floor(r() * 30), 1, 3, R.oldWood[0]) // сучки и трещины
  }
  // нижняя доска потемнела от сырости
  for (let x = 8; x < W - 8; x++) for (let y = wallBottom - 5; y < wallBottom; y++) body.px(x, y, R.oldWood[1], 120)
  // фундамент из камней
  for (let x = 6; x < W - 6; x += 7) body.shadedEllipse(x + 3, wallBottom + 3, 4, 3, R.stone)

  // окно: рама, стекло с отражением, крестовина
  body.rect(16, 54, 26, 21, R.wood[1])
  body.rect(18, 56, 22, 17, P.glassDark)
  for (let y = 56; y < 73; y++) for (let x = 18; x < 40; x++) if (x - 18 + (y - 56) < 9) body.px(x, y, P.glass)
  body.line(20, 58, 24, 58, P.glassLight)
  body.line(20, 59, 22, 59, P.glassLight)
  body.rect(28, 56, 2, 17, R.wood[2])
  body.rect(18, 63, 22, 2, R.wood[2])
  body.rect(15, 75, 28, 2, R.wood[4]) // подоконник

  // дверной проём: тёмная глубина и покосившаяся створка
  body.rect(70, 52, 26, wallBottom - 52, R.wood[0])
  body.rect(72, 54, 22, wallBottom - 54, '#1d1712')
  for (let y = 54; y < wallBottom; y++) for (let x = 72; x < 94; x++) if (y < 60 || x < 75) body.px(x, y, '#2a211a')
  body.rect(76, wallBottom - 6, 10, 2, R.soil[3]) // земля на пороге
  for (let y = 54; y < wallBottom; y++) for (let x = 95; x < 104; x++) body.px(x, y + Math.floor((x - 95) / 4), R.oldWood[x === 95 ? 4 : x === 103 ? 1 : 3])
  body.rect(97, 64, 3, 2, R.stone[2]) // петля

  // крыша: ржавый профлист с волнами, светлее у конька
  const roofTop = 6
  const roofBottom = wallTop + 6
  for (let y = roofTop; y < roofBottom; y++)
    for (let x = 0; x < W; x++) {
      const wave = x % 4
      const height = (y - roofTop) / (roofBottom - roofTop)
      const tone = Math.max(0, Math.min(5, (wave === 0 ? 1 : wave === 1 ? 4 : 3) - Math.floor(height * 1.6)))
      body.px(x, y, R.roof[tone])
    }
  // ржавчина пятнами с дизерингом
  for (let i = 0; i < 12; i++) {
    const cx = 6 + r() * (W - 12)
    const cy = 10 + r() * 28
    const rx = 4 + r() * 9
    const ry = 2 + r() * 4
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
        if (d < 1 && noise(x, y, 2, i, 1e9) > d * 0.8) body.px(x, y, pick(R.rust, 1 - d, x, y))
      }
  }
  // дыра в крыше и водосток
  body.ellipse(91, 17, 5, 3, '#1d1712')
  body.line(86, 15, 96, 15, R.rust[1])
  for (let x = 0; x < W; x++) {
    body.px(x, roofBottom - 1, R.roof[0])
    body.px(x, roofBottom, R.stone[1])
  }
  body.rect(0, roofTop, W, 1, R.roof[5])
  // труба
  for (let y = 0; y < 11; y++) for (let x = 104; x < 112; x++) body.px(x, y, R.stone[x === 104 ? 4 : x === 111 ? 1 : 3])
  body.rect(103, 0, 10, 2, R.stone[2])
  body.outline(INK)

  // приставная лестница слева, как на референсе
  const ladder = new Sprite(W, H)
  for (let y = 30; y < H - 6; y++) {
    ladder.px(2 + Math.floor((y - 30) / 14), y, R.wood[4])
    ladder.px(9 + Math.floor((y - 30) / 14), y, R.wood[2])
  }
  for (let y = 34; y < H - 8; y += 7) ladder.line(3 + Math.floor((y - 30) / 14), y, 9 + Math.floor((y - 30) / 14), y, R.wood[3])
  ladder.outline(INK)

  s.shadow(W / 2 + 6, H - 4, W / 2 - 2, 6, 100)
  s.stamp(body)
  s.stamp(ladder)
  // мох и трава у стены
  for (let i = 0; i < 6; i++) weedClump(s, 12 + r() * (W - 24), H - 6 + r() * 3, r)
  return s
}

export function tools() {
  const s = new Sprite(2 * T, T)
  const t = new Sprite(2 * T, T)
  const handle = (x, y0, y1) => {
    for (let y = y0; y < y1; y++) {
      t.px(x, y, R.wood[5])
      t.px(x + 1, y, R.wood[3])
    }
  }
  // лопата
  handle(10, 2, 20)
  t.rect(7, 1, 7, 2, R.wood[2])
  for (let y = 20; y < 30; y++) for (let x = 7; x < 15; x++) if (!(y > 27 && (x === 7 || x === 14))) t.px(x, y, pick(R.stone, 0.75 - (x - 7) / 14, x, y))
  t.rect(8, 23, 3, 4, R.rust[2])
  // ржавая лопатка
  handle(24, 4, 21)
  for (let y = 21; y < 30; y++) for (let x = 21; x < 28; x++) t.px(x, y, pick(R.rust, 0.8 - (x - 21) / 12, x, y))
  // грабли
  handle(41, 2, 23)
  t.rect(34, 23, 16, 2, R.stone[3])
  t.rect(34, 24, 16, 1, R.stone[1])
  for (let x = 34; x < 50; x += 3) t.rect(x, 25, 1, 4, R.stone[2])
  t.outline(INK)
  s.stamp(t)
  return s
}

export function barrel() {
  const s = new Sprite(T, T)
  s.shadow(18, 29, 11, 2.5, 100)
  const b = new Sprite(T, T)
  // цилиндр: тон по горизонтали — свет слева
  for (let y = 7; y < 29; y++)
    for (let x = 7; x < 25; x++) {
      const bulge = Math.abs(y - 18) > 8 ? 1 : 0
      if (x < 7 + bulge || x > 24 - bulge) continue
      const lit = 1 - (x - 7) / 17 + (x === 9 ? 0.25 : 0)
      b.px(x, y, pick(R.wood.slice(1), lit * 0.95, x, y))
    }
  for (let x = 8; x < 24; x += 4) for (let y = 8; y < 28; y++) b.px(x, y, R.wood[1], 120) // клёпки
  for (const y of [11, 23]) for (let x = 7; x < 25; x++) b.px(x, y, pick(R.rust, 0.9 - (x - 7) / 18, x, y))
  b.ellipse(16, 7, 8, 2.5, R.wood[2])
  b.ellipse(16, 7.5, 6.5, 1.5, '#1d1712')
  b.px(14, 7, R.leaf[1])
  b.px(17, 7, R.straw[2]) // листья на дне
  b.outline(INK)
  s.stamp(b)
  return s
}

export function wheelbarrow() {
  const s = new Sprite(T, T)
  s.shadow(16, 28, 13, 2.5, 100)
  const w = new Sprite(T, T)
  for (let y = 10; y < 21; y++) for (let x = 3 + (y - 10) / 3; x < 26 - (y - 10) / 4; x++) w.px(x, y, pick(R.rust, 1 - (y - 10) / 12, Math.floor(x), y))
  w.rect(6, 12, 17, 5, R.soil[2])
  w.rect(6, 12, 17, 1, R.soil[4])
  w.line(24, 13, 31, 11, R.wood[4])
  w.line(24, 14, 31, 12, R.wood[2])
  w.rect(21, 20, 2, 6, R.wood[2])
  w.outline(INK)
  s.stamp(w)
  const wheel = new Sprite(T, T)
  wheel.shadedEllipse(9, 23, 4.5, 4.5, R.stone)
  wheel.ellipse(9, 23, 1.5, 1.5, R.rust[1])
  wheel.outline(INK)
  s.stamp(wheel)
  return s
}

export function rock() {
  const s = new Sprite(T, T)
  s.shadow(17, 26, 11, 2.5, 100)
  const st = new Sprite(T, T)
  st.shadedEllipse(13, 20, 8, 6, R.stone)
  st.shadedEllipse(22, 22, 5, 4, R.stone, { bias: -0.08 })
  st.shadedEllipse(19, 15, 4, 3, R.stone, { bias: 0.05 })
  st.outline(INK)
  s.stamp(st)
  for (const [x, y] of [[9, 24], [10, 24], [16, 25], [23, 25]]) s.px(x, y, R.weed[3]) // мох
  return s
}

/** Каменная чаша: спит — сухой мох и трещина; пробуждена — светящиеся цветы и сияние. */
export function basin(awakened) {
  const s = new Sprite(T, T)
  const r = rng(awakened ? 811 : 810)
  if (awakened) {
    s.ellipse(16, 16, 15, 13, R.leaf[6], 45)
    s.ellipse(16, 15, 11, 9, P.petal, 45)
  }
  s.shadow(18, 29, 11, 2.5, 100)
  const st = new Sprite(T, T)
  for (let y = 20; y < 28; y++) for (let x = 12; x < 21; x++) st.px(x, y, pick(R.stone, 1 - (x - 12) / 10, x, y))
  st.rect(10, 26, 13, 2, R.stone[2])
  st.shadedEllipse(16, 15, 12, 6.5, R.stone)
  st.ellipse(16, 14, 9.5, 4, awakened ? R.leaf[0] : R.soil[1])
  for (const x of [7, 12, 20, 25]) st.px(x, 17, R.stone[5]) // знаки-листья
  st.outline(INK)
  s.stamp(st)
  if (!awakened) {
    for (let i = 0; i < 22; i++) s.px(8 + r() * 16, 11 + r() * 5, r() > 0.5 ? R.weed[2] : R.grass[2])
    s.line(20, 15, 21, 21, INK)
    return s
  }
  const flowers = new Sprite(T, T)
  for (const [x, y] of [[10, 12], [22, 12], [16, 9]]) flowers.shadedEllipse(x, y, 2.5, 2, R.leaf)
  for (const [x, y, c] of [[12, 8, '#c7a2e3'], [20, 7, '#c7a2e3'], [16, 4, '#e6d4f5'], [8, 10, '#a77fd0'], [24, 10, '#a77fd0']]) {
    flowers.rect(x - 1, y - 1, 3, 3, c)
    flowers.px(x, y - 1, P.white)
  }
  flowers.outline(R.leaf[0])
  s.stamp(flowers)
  return s
}

export function propFrames() {
  return {
    prop_shed: shed(),
    prop_tools: tools(),
    prop_barrel: barrel(),
    prop_wheelbarrow: wheelbarrow(),
    prop_rock: rock(),
    prop_basin: basin(false),
    prop_basin_awakened: basin(true),
  }
}

export { grassFill }
