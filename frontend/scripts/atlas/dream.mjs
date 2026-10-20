// Светлолесье — глухая часть чащи за Лунной поляной, куда никто не заходит: индиговая трава с искрами,
// светящиеся грибы, лесной ручей со звёздами, хрустальные деревья и большие светящиеся кошки.

import { rng, Sprite } from './canvas.mjs'
import { bed, T } from './tiles.mjs'
import { INK, P } from './palette.mjs'

const GRASS = ['#141633', '#1c2046', '#262b5a', '#323a70']
const DUST = ['#3a3460', '#55497f', '#7a69a6', '#a998cc']
const TEAL = ['#123a3f', '#1e5e63', '#2f8f8f', '#6fd1c4', '#c4fff2']
const STAR = ['#1a2a52', '#26407a', '#3c62a8', '#7fa6e0', '#d6e8ff']
const LILAC = ['#3e2e57', '#5b4680', '#8a74b4', '#c2b2e2', '#f1eaff']
const CAT = ['#6b5a8f', '#9a88c4', '#c9bbea', '#ece6fb', '#ffffff']
const NIGHTCAT = ['#0f1630', '#1b2752', '#2c3f7a', '#4a63a8', '#8ea6e6']

/** Трава Светлолесья: индиговая, с редкими искрами. */
function dreamgrass(seed) {
  const s = new Sprite(T, T)
  const r = rng(70 + seed)
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) s.px(x, y, (x * 5 + y * 7 + seed * 3) % 13 === 0 ? GRASS[2] : GRASS[1])
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * T)
    const y = 2 + Math.floor(r() * 28)
    s.line(x, y, x + (i % 2 ? 1 : -1), y - 3, GRASS[3])
  }
  for (let i = 0; i < 2 + seed; i++) s.px(Math.floor(r() * T), Math.floor(r() * T), STAR[4])
  return s
}

/** Тропа из звёздной пыли. */
function stardust(seed) {
  const s = new Sprite(T, T)
  const r = rng(90 + seed)
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) s.px(x, y, (x + y * 3 + seed) % 7 === 0 ? DUST[2] : DUST[1])
  for (let i = 0; i < 5; i++) s.px(Math.floor(r() * T), Math.floor(r() * T), LILAC[4])
  return s
}

const EARTH = ['#120e1f', '#1d1631', '#2a2045', '#382b58', '#47386c']

/** Мшистая грядка: тёмная рыхлая земля, края заросли сонной травой, кое-где — бирюзовый мох. */
function mossBed(mask) {
  const s = bed(mask, EARTH, (seed) => dreamgrass(seed % 3), 760)
  const r = rng(800 + mask)
  for (let i = 0; i < 4; i++) {
    const x = 8 + Math.floor(r() * 16)
    const y = 8 + Math.floor(r() * 16)
    s.px(x, y, TEAL[2])
    s.px(x + 1, y, TEAL[1])
  }
  return s
}

/** Светящиеся грибы на тёмной траве. */
function glowshrooms(seed) {
  const s = dreamgrass(seed)
  const r = rng(110 + seed)
  for (let i = 0; i < 4; i++) {
    const x = 4 + Math.floor(r() * 24)
    const y = 10 + Math.floor(r() * 18)
    s.rect(x, y, 1, 4, TEAL[3])
    s.shadedEllipse(x, y, 3, 2, TEAL.slice(1))
    s.px(x - 1, y - 1, TEAL[4])
  }
  return s
}

/** Звёздная вода: тёмная, с бегущими бликами-звёздочками. */
function starwater(seed) {
  const s = new Sprite(T, T)
  const r = rng(130 + seed)
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) s.px(x, y, (x * 3 + y + seed * 5) % 9 === 0 ? STAR[2] : STAR[1])
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * 28)
    const y = Math.floor(r() * T)
    s.rect(x, y, 3, 1, STAR[3])
  }
  for (let i = 0; i < 3; i++) s.px(Math.floor(r() * T), Math.floor(r() * T), STAR[4])
  return s
}

/** Хрустальное дерево 2×3: спит тёмным стеклом или светится лиловым. */
function crystalTree(lit) {
  const W = 2 * T
  const H = 3 * T
  const s = new Sprite(W, H)
  const b = new Sprite(W, H)
  const ramp = lit ? LILAC.slice(1) : ['#2a2638', '#3a3550', '#4c4668', '#5f5880']
  b.rect(29, 52, 6, 40, lit ? LILAC[1] : '#2a2638')
  const r = rng(lit ? 3 : 4)
  for (const [cx, cy, rx, ry] of [[32, 30, 22, 20], [18, 44, 12, 10], [46, 42, 12, 10], [32, 12, 12, 10]]) b.shadedEllipse(cx, cy, rx, ry, ramp)
  for (let i = 0; i < 14; i++) {
    const x = 12 + Math.floor(r() * 40)
    const y = 6 + Math.floor(r() * 46)
    b.px(x, y, lit ? LILAC[4] : ramp[3])
  }
  b.outline(INK)
  s.shadow(32, H - 4, 18, 3)
  s.stamp(b)
  return s
}

/** Светящийся куст 1×1 — в нём что-то позвякивает. */
function glowBush() {
  const s = new Sprite(T, T)
  const b = new Sprite(T, T)
  b.shadedEllipse(16, 20, 13, 10, TEAL.slice(0, 4))
  b.shadedEllipse(10, 15, 7, 6, TEAL.slice(1, 4))
  b.shadedEllipse(22, 15, 7, 6, TEAL.slice(1, 4))
  for (const [x, y] of [[8, 18], [16, 12], [24, 20], [14, 24]]) b.px(x, y, TEAL[4])
  b.outline(INK)
  s.stamp(b)
  return s
}

/**
 * Большая светящаяся кошка 64×56: лежит, обернувшись хвостом; frame 1 — хвост вздрагивает, глаза щурятся.
 * ramp — шерсть: лунная (Мурлана) или ночная со звёздами (Тень).
 */
function greatCat(ramp, frame, stars) {
  const s = new Sprite(64, 56)
  s.shadow(32, 53, 26, 2.5)
  const c = new Sprite(64, 56)
  c.shadedEllipse(34, 40, 22, 12, ramp, { bias: 0.05 }) // тело
  const tail = frame ? [[54, 46], [58, 42], [60, 36], [58, 31]] : [[54, 46], [58, 44], [61, 40], [61, 35]]
  for (const [x, y] of tail) c.shadedEllipse(x, y, 3, 3, ramp)
  c.shadedEllipse(16, 30, 12, 11, ramp, { bias: 0.1 }) // голова
  for (const [x, dir] of [[8, -1], [24, 1]]) {
    for (let k = 0; k < 7; k++) for (let j = -3 + Math.floor(k / 2); j <= 3 - Math.floor(k / 2); j++) c.px(x + j + dir, 21 - k, ramp[2])
  }
  c.shadedEllipse(14, 50, 5, 3, ramp) // лапы
  c.shadedEllipse(26, 50, 5, 3, ramp)
  c.outline(INK)
  s.stamp(c)
  // глаза-светлячки
  for (const x of [11, 21]) {
    if (frame) s.rect(x - 1, 30, 4, 1, TEAL[4])
    else {
      s.rect(x - 1, 28, 3, 3, TEAL[3])
      s.px(x, 29, TEAL[4])
    }
  }
  s.px(16, 33, ramp === CAT ? '#e8a3b8' : TEAL[3]) // нос
  if (stars) for (const [x, y] of [[30, 34], [40, 38], [46, 33], [36, 44], [20, 26]]) s.px(x, y, STAR[4])
  return s
}

/** Котёнок Искорка 32×48: маленький, весь светится, хвост трубой. */
function kitten(frame) {
  const s = new Sprite(32, 48)
  s.shadow(16, 46, 7, 1.5)
  const c = new Sprite(32, 48)
  c.shadedEllipse(16, 40, 6, 5, CAT, { bias: 0.05 })
  c.shadedEllipse(16, 31, 6, 5.5, CAT, { bias: 0.1 })
  for (const x of [11, 21]) for (let k = 0; k < 4; k++) for (let j = -2 + Math.floor(k / 2); j <= 2 - Math.floor(k / 2); j++) c.px(x + j, 26 - k, CAT[2])
  for (let k = 0; k < 9; k++) c.px(22 + Math.round(Math.sin(k / 2 + frame) * 2), 41 - k, CAT[2]) // хвост
  c.outline(INK)
  s.stamp(c)
  s.px(13, 31, INK)
  s.px(19, 31, INK)
  s.px(16, 33, '#e8a3b8')
  return s
}

export function dreamFrames() {
  return {
    dreamgrass_0: dreamgrass(0),
    dreamgrass_1: dreamgrass(1),
    dreamgrass_2: dreamgrass(2),
    stardust_0: stardust(0),
    stardust_1: stardust(1),
    glowshrooms_0: glowshrooms(0),
    glowshrooms_1: glowshrooms(1),
    glowshrooms_2: glowshrooms(2),
    starwater_0: starwater(0),
    starwater_1: starwater(1),
    starwater_2: starwater(2),
    ...Object.fromEntries(Array.from({ length: 16 }, (_, m) => [`moss_bed_${m}`, mossBed(m)])),
    prop_crystal_tree: crystalTree(false),
    prop_crystal_tree_awakened: crystalTree(true),
    prop_glow_bush: glowBush(),
    npc_greatcat_0: greatCat(CAT, 0, false),
    npc_greatcat_1: greatCat(CAT, 1, false),
    npc_nightcat_0: greatCat(NIGHTCAT, 0, true),
    npc_nightcat_1: greatCat(NIGHTCAT, 1, true),
    npc_kitten_0: kitten(0),
    npc_kitten_1: kitten(1),
  }
}

export { P }
