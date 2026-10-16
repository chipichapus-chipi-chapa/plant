// Восточная тропа: еловый лес по краям (как лес в Inscryption — тёмный полог, горизонтальные штрихи,
// стволы на опушке), ручей, старый мост, родник, нора под корнями, указатель — и мыши-жители.

import { checker, noise, pick, rng, Sprite } from './canvas.mjs'
import { T, tuft } from './tiles.mjs'
import { INK, P, R } from './palette.mjs'

const N = 1
const E = 2
const S = 4
const W = 8
const CANOPY = '#070c08'

// --- Лес ------------------------------------------------------------------------------------

/**
 * Лес по маске соседей-леса. Внутри — почти чёрный полог с редкими штрихами хвои.
 * Где снизу поляна — опушка: светлее кромка хвои и стволы; на других открытых сторонах — рваная кромка.
 */
function forest(mask) {
  const s = new Sprite(T, T)
  const r = rng(900 + mask)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const n = noise(x, y * 3, 5, 77, T)
      s.px(x, y, n > 0.78 && y % 2 === 0 ? R.bramble[1] : CANOPY)
    }
  const open = (side) => !(mask & side)
  if (open(S)) {
    // стволы на опушке
    for (const tx of [5, 19]) {
      const w = 6
      for (let y = 20; y < T; y++) for (let i = 0; i < w; i++) s.px(tx + i + (y > 28 ? (i < 2 ? -1 : 1) : 0), y, R.wood[i === 0 ? 3 : i === w - 1 ? 1 : 2])
      s.rect(tx - 1, 31, w + 2, 1, INK)
    }
    // нижние лапы ели: светлые горизонтальные штрихи, края — шахматкой
    for (let y = 8; y < 22; y++)
      for (let x = 0; x < T; x++) {
        const band = (y - 8) / 14
        const v = noise(x, y, 4, 91 + Math.floor(y / 2), T)
        if (y % 2 === 1 && v > 0.35 + band * 0.3) s.px(x, y, v > 0.7 ? R.leaf[3] : R.leaf[2])
        else if (y > 19 && checker(x, y) && v > 0.5) s.px(x, y, R.leaf[1])
      }
  }
  if (open(N)) for (let x = 0; x < T; x++) for (let y = 0; y < 3 + Math.floor(noise(x, 0, 4, 12, T) * 3); y++) if (y % 2 === 0) s.px(x, y, R.leaf[1])
  if (open(W)) for (let y = 0; y < T; y += 2) for (let x = 0; x < 2 + Math.floor(r() * 3); x++) s.px(x, y, R.leaf[1])
  if (open(E)) for (let y = 1; y < T; y += 2) for (let x = T - 1; x > T - 3 - Math.floor(r() * 3); x--) s.px(x, y, R.leaf[1])
  return s
}

// --- Ручей и мост ---------------------------------------------------------------------------

/** Вода по маске соседей-воды (и моста): тёмная, с бликами-штрихами; по бокам — берег. */
function water(mask) {
  const s = new Sprite(T, T)
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const v = noise(x, y * 4, 6, 33, T)
      s.px(x, y, v > 0.78 && y % 3 === 0 ? R.dew[3] : v > 0.55 && y % 3 === 0 ? R.dew[2] : R.dew[v > 0.3 ? 1 : 0])
    }
  const bank = (x0, dir) => {
    for (let y = 0; y < T; y++) {
      const w = 3 + Math.floor(noise(0, y, 4, x0 + 5, T) * 3)
      for (let i = 0; i < w; i++) s.px(dir > 0 ? x0 + i : x0 - i, y, i === w - 1 ? INK : i === w - 2 ? R.dirt[1] : R.dirt[2])
    }
  }
  if (!(mask & W)) bank(0, 1)
  if (!(mask & E)) bank(T - 1, -1)
  return s
}

/** Мост поперёк ручья: доски поперёк хода, перила сверху и снизу, столбики. */
function bridge() {
  const s = water(N | S | E | W)
  const b = new Sprite(T, T)
  for (let x = 0; x < T; x++) {
    const plank = Math.floor(x / 5)
    for (let y = 6; y < 27; y++) b.px(x, y, x % 5 === 4 ? R.oldWood[0] : R.oldWood[plank % 2 ? 3 : 4 - (y % 7 === 0 ? 1 : 0)])
  }
  for (const y of [3, 27]) {
    for (let x = 0; x < T; x++) {
      b.px(x, y, R.wood[4])
      b.px(x, y + 1, R.wood[2])
    }
    for (const x of [3, 19]) b.rect(x, y - 2, 3, 6, R.wood[3])
  }
  b.rect(10, 3, 4, 2, R.straw[2]) // верёвка, которой чинили перила
  b.outline(INK)
  s.stamp(b)
  return s
}

// --- Предметы -------------------------------------------------------------------------------

function gateOpen() {
  const s = new Sprite(T, T)
  const g = new Sprite(T, T)
  for (const x of [2, 26]) for (let y = 2; y < 30; y++) g.rect(x, y, 4, 1, R.oldWood[x === 2 ? 4 : 2])
  // створка распахнута внутрь сада — видна ребром
  for (let y = 6; y < 28; y++) g.rect(6, y, 3, 1, R.oldWood[3])
  g.outline(INK)
  s.stamp(g)
  return s
}

function burrow() {
  const s = new Sprite(T, T)
  const b = new Sprite(T, T)
  // корни аркой
  for (let a = 0; a <= 20; a++) {
    const t = (a / 20) * Math.PI
    const x = 16 - Math.cos(t) * 12
    const y = 26 - Math.sin(t) * 16
    b.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, R.wood[a % 4 === 0 ? 1 : 2])
  }
  b.outline(INK)
  s.stamp(b)
  s.ellipse(16, 22, 6, 6, P.dark)
  s.rect(10, 22, 13, 6, P.dark)
  s.shadedEllipse(16, 21, 5, 5, R.wood.slice(2, 5), { clip: (x, y) => y < 28 }) // круглая дверца
  s.px(19, 22, R.straw[4]) // ручка
  for (let x = 9; x < 24; x++) s.px(x, 28, checker(x, 28) ? R.leaf[3] : R.leaf[2]) // коврик из мха
  return s
}

function spring() {
  const s = new Sprite(T, T)
  s.shadow(16, 27, 13, 3)
  const st = new Sprite(T, T)
  for (const [x, y, rx] of [[7, 20, 5], [16, 16, 6], [25, 20, 5], [11, 26, 5], [22, 26, 5]]) st.shadedEllipse(x, y, rx, rx * 0.8, R.stone.slice(1))
  st.outline(INK)
  s.stamp(st)
  for (let y = 19; y < 26; y++) for (let x = 11; x < 22; x++) if (((x - 16) / 5.5) ** 2 + ((y - 22) / 3.5) ** 2 < 1) s.px(x, y, pick(R.dew.slice(1), 1 - Math.abs(x - 15) / 7, x, y))
  s.px(14, 21, R.dew[4])
  s.px(17, 23, R.dew[4])
  return s
}

function bridgePost(searched) {
  const s = new Sprite(T, T)
  s.shadow(16, 28, 9, 2.5)
  const p = new Sprite(T, T)
  for (let y = 4; y < 27; y++) for (let x = 12; x < 20; x++) p.px(x, y, R.oldWood[x === 12 ? 4 : x === 19 ? 1 : 3])
  for (let y = 8; y < 24; y += 3) for (let x = 12; x < 20; x++) if ((x + y) % 3 === 0) p.px(x, y, R.leaf[2]) // мох
  p.shadedEllipse(10, 27, 4, 2.5, R.stone.slice(1))
  p.shadedEllipse(22, 27, 4, 2.5, R.stone.slice(1))
  p.outline(INK)
  s.stamp(p)
  if (!searched) {
    s.px(15, 28, R.lamp[4]) // что-то блестит между камней
    s.px(16, 28, R.bone[3])
  }
  return s
}

function signpost() {
  const s = new Sprite(T, T)
  s.shadow(16, 29, 6, 2)
  const p = new Sprite(T, T)
  for (let y = 10; y < 29; y++) p.rect(15, y, 3, 1, R.oldWood[y % 5 === 0 ? 2 : 3])
  for (let y = 6; y < 13; y++) for (let x = 6; x < 25 + (y < 9 ? y - 6 : 12 - y); x++) p.px(x, y, y === 6 ? R.oldWood[4] : R.oldWood[3])
  p.outline(INK)
  s.stamp(p)
  for (let x = 9; x < 22; x += 2) s.px(x, 9, R.oldWood[1]) // буквы
  return s
}

function thicket() {
  const s = forest(0)
  for (let y = 0; y < T; y++) for (let x = 0; x < 6; x++) if (checker(x, y) || x < 2) s.px(x, y, R.dirt[2]) // тропа уходит под ели
  return s
}

// --- Мыши -----------------------------------------------------------------------------------

const MOUSE = {
  brown: ['#3a2618', '#5a3d27', '#7a5638', '#98734f'],
  grey: ['#3a3836', '#5a5752', '#7d7a73', '#a09c93'],
  white: ['#6e665a', '#9c9282', '#c7bca6', '#e6dcc4'],
}
const PINK = ['#7a4050', '#b06878']

/**
 * Мышь в кадре 32×48 (как у остальных персонажей, низ — земля). Маленькая: голова с большими ушами,
 * глаза-точки, розовый нос, хвост завитком. Кадр 1 — уши дрогнули, хвост качнулся.
 */
function mouse(kind, frame) {
  const s = new Sprite(32, 48)
  const fur = MOUSE[kind]
  s.shadow(16, 46, 8, 1.5)
  const m = new Sprite(32, 48)
  // хвост завитком по земле
  const tail = frame ? [[22, 44], [24, 43], [26, 42], [27, 40], [26, 38]] : [[22, 44], [24, 44], [26, 43], [27, 41], [27, 39]]
  for (const [x, y] of tail) m.rect(x, y, 2, 1, PINK[0])
  m.shadedEllipse(16, 40, 7, 5.5, fur, { bias: 0.05 }) // тело
  m.rect(12, 44, 3, 2, PINK[1])
  m.rect(18, 44, 3, 2, PINK[1])
  m.shadedEllipse(16, 32, 6, 5, fur, { bias: 0.1 }) // голова
  const twitch = frame ? 1 : 0
  for (const [x, dir] of [[10, -1], [22, 1]]) {
    m.shadedEllipse(x + dir * twitch * 0.5, 26 - twitch, 3.5, 3.5, fur, { bias: 0.1 })
    m.ellipse(x + dir * twitch * 0.5, 26.5 - twitch, 1.8, 1.8, PINK[1])
  }
  m.outline(INK)
  s.stamp(m)
  s.px(13, 32, INK)
  s.px(19, 32, INK)
  s.px(13, 31, P.white)
  s.rect(15, 34, 2, 1, PINK[1])
  return s
}

/** Наряды мышей: Крупка — фартук, Шорох — красный шарф, Ветошь — шаль и очки. */
function dressed(kind, frame) {
  const s = mouse(kind === 'krupka' ? 'brown' : kind === 'shorokh' ? 'grey' : 'white', frame)
  const d = new Sprite(32, 48)
  if (kind === 'krupka') {
    for (let y = 37; y < 45; y++) for (let x = 12; x < 21; x++) d.px(x, y, R.cream[x === 12 ? 4 : x === 20 ? 2 : 3])
    d.rect(11, 37, 11, 1, R.cream[1])
    d.rect(15, 40, 3, 2, R.cream[1]) // карман
  } else if (kind === 'shorokh') {
    for (let x = 11; x < 22; x++) d.rect(x, 36, 1, 2, R.berry[x < 13 ? 4 : 3])
    d.rect(19, 38, 2, 4, R.berry[2])
  } else {
    for (let y = 36; y < 42; y++) for (let x = 10 + (y - 36); x < 23 - (y - 36); x++) d.px(x, y, (x + y) % 3 === 0 ? R.heather[2] : R.heather[3])

  }
  d.outline(INK)
  s.stamp(d)
  if (kind === 'vetosh') {
    // круглые очки: тонкая оправа вокруг глаз и перемычка
    for (const cx of [13, 19]) {
      for (const [dx, dy] of [[-1, -1], [0, -2], [1, -1], [-2, 0], [2, 0], [-1, 1], [0, 2], [1, 1]]) s.px(cx + dx, 32 + dy, R.silver[1])
    }
    s.rect(15, 31, 3, 1, R.silver[1])
  }
  return s
}

export function eastFrames() {
  const frames = {}
  for (let m = 0; m < 16; m++) {
    frames[`forest_${m}`] = forest(m)
    frames[`water_${m}`] = water(m)
  }
  frames.bridge = bridge()
  frames.prop_gate_open = gateOpen()
  frames.prop_burrow = burrow()
  frames.prop_spring = spring()
  frames.prop_bridge_post = bridgePost(false)
  frames.prop_bridge_post_searched = bridgePost(true)
  frames.prop_signpost = signpost()
  frames.prop_thicket = thicket()
  for (const k of ['krupka', 'shorokh', 'vetosh']) for (const f of [0, 1]) frames[`npc_${k}_${f}`] = dressed(k, f)
  return frames
}

export { tuft }
