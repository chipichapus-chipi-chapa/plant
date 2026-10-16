// Сборка персонажа из слоёв атласа: тело → одежда → сумка → волосы → аксессуар.
// У каждого слоя свой кадр на направление (к зрителю, спиной, вбок) и фазу шага.
// Слои нарисованы маркерными цветами (см. scripts/build-placeholder-atlas.mjs),
// здесь они перекрашиваются в цвета, выбранные игроком. Так 3 одежды × 6 причёсок × 6 цветов
// дают сотни обликов без отдельной картинки на каждый.

import type { AppearanceSlot } from '../api/types'
import type { Atlas } from './atlas'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH } from './renderer'

export type Rgb = [number, number, number]

/** Маркерные цвета слоёв: глубокая тень, тень, основной, блик и румянец. */
export const MASK = {
  deep: [64, 0, 64] as Rgb,
  base: [255, 0, 255] as Rgb,
  shade: [128, 0, 128] as Rgb,
  light: [255, 128, 255] as Rgb,
  blush: [255, 0, 128] as Rgb,
}

const BLUSH: Rgb = [224, 112, 122]

export function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))

/** Тень того же цвета: темнее и чуть теплее, чтобы не уходить в серость. */
export function shadeOf([r, g, b]: Rgb): Rgb {
  return [clamp(r * 0.74 + 4), clamp(g * 0.7), clamp(b * 0.7)]
}

export function lightOf([r, g, b]: Rgb): Rgb {
  return [clamp(r * 1.15 + 14), clamp(g * 1.15 + 14), clamp(b * 1.15 + 14)]
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [clamp(a[0] + (b[0] - a[0]) * t), clamp(a[1] + (b[1] - a[1]) * t), clamp(a[2] + (b[2] - a[2]) * t)]
}

const same = (data: Uint8ClampedArray, i: number, c: Rgb) => data[i] === c[0] && data[i + 1] === c[1] && data[i + 2] === c[2]

/** Перекрашивает маркерные пиксели RGBA-буфера в цвет color (на месте). */
export function recolor(data: Uint8ClampedArray, color: Rgb): void {
  const targets: [Rgb, Rgb][] = [
    [MASK.deep, shadeOf(shadeOf(color))],
    [MASK.base, color],
    [MASK.shade, shadeOf(color)],
    [MASK.light, lightOf(color)],
    [MASK.blush, mix(color, BLUSH, 0.45)],
  ]
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    for (const [mask, to] of targets) {
      if (same(data, i, mask)) {
        data[i] = to[0]
        data[i + 1] = to[1]
        data[i + 2] = to[2]
        break
      }
    }
  }
}

export type Appearance = Record<string, string>

/** Куда смотрит спрайт: к зрителю, спиной или вбок (вправо; влево — тот же кадр, отражённый). */
export type Direction = 'down' | 'up' | 'side'

/** Направление и фаза шага: 0 — стоит, 1 и 2 — шаг левой и правой ногой. */
export type Pose = { direction: Direction; step: 0 | 1 | 2 }

/** Все кадры персонажа: по три фазы шага на каждое направление. */
export type CharacterFrames = Record<Direction, HTMLCanvasElement[]>

type Layer = { frame: (a: Appearance, p: Pose) => string | null; colorSlot?: string }

/**
 * Слои персонажа снизу вверх и какой цветовой слот их красит.
 * Шаг меняет только тело и одежду (ноги, руки); волосы и аксессуары зависят лишь от направления.
 * Новый вариант причёски или одежды — новые кадры атласа; новый слот — новая строка здесь.
 */
const LAYERS: Layer[] = [
  // задний слой волос (длинные, каре, кудри) — за спиной, виден только спереди
  { frame: (a, p) => `char_hairback_${a.hair}_${p.direction}`, colorSlot: 'hair_color' },
  { frame: (_, p) => `char_body_${p.direction}_${p.step}`, colorSlot: 'skin' },
  { frame: (a, p) => `char_outfit_${a.outfit}_${p.direction}_${p.step}`, colorSlot: 'outfit_color' },
  // сумка поверх одежды, под волосами: сзади рюкзак виден целиком, спереди — лямки
  { frame: (a, p) => (a.bag && a.bag !== 'none' ? `char_bag_${a.bag}_${p.direction}` : null) },
  { frame: (a, p) => `char_hair_${a.hair}_${p.direction}`, colorSlot: 'hair_color' },
  { frame: (a, p) => (a.accessory && a.accessory !== 'none' ? `char_acc_${a.accessory}_${p.direction}` : null) },
]

const STANDING: Pose = { direction: 'down', step: 0 }

/** Какой кадр показать, когда персонаж смотрит в эту сторону: влево — боковой, отражённый. */
export function directionFor(facing: 'up' | 'down' | 'left' | 'right'): { direction: Direction; flip: boolean } {
  if (facing === 'left' || facing === 'right') return { direction: 'side', flip: facing === 'left' }
  return { direction: facing, flip: false }
}

/** Кадры для всех направлений и фаз шага — то, что нужно персонажу, чтобы ходить и разворачиваться. */
export function composeCharacterFrames(atlas: Atlas, appearance: Appearance, slots: AppearanceSlot[]): CharacterFrames {
  const steps = (direction: Direction) =>
    ([0, 1, 2] as const).map((step) => composeCharacter(atlas, appearance, slots, { direction, step }))
  return { down: steps('down'), up: steps('up'), side: steps('side') }
}

const cache = new Map<string, HTMLCanvasElement>()

/** Готовый спрайт персонажа 32×48 в нужной позе (кэшируется по облику и позе). */
export function composeCharacter(
  atlas: Atlas,
  appearance: Appearance,
  slots: AppearanceSlot[],
  pose: Pose = STANDING,
): HTMLCanvasElement {
  const key = `${JSON.stringify(appearance)}|${pose.direction}|${pose.step}`
  const cached = cache.get(key)
  if (cached) return cached

  const colorOf = (slotKey: string) => {
    const slot = slots.find((s) => s.key === slotKey)
    const option = slot?.options.find((o) => o.key === appearance[slotKey]) ?? slot?.options[0]
    return option?.color ? hexToRgb(option.color) : null
  }

  const result = document.createElement('canvas')
  result.width = CHARACTER_WIDTH
  result.height = CHARACTER_HEIGHT
  const ctx = result.getContext('2d')!
  const scratch = document.createElement('canvas')
  scratch.width = CHARACTER_WIDTH
  scratch.height = CHARACTER_HEIGHT
  const sctx = scratch.getContext('2d', { willReadFrequently: true })!

  for (const layer of LAYERS) {
    const name = layer.frame(appearance, pose)
    const f = name ? atlas.frames[name] : undefined
    if (!f) continue
    sctx.clearRect(0, 0, CHARACTER_WIDTH, CHARACTER_HEIGHT)
    sctx.drawImage(atlas.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h)
    const color = layer.colorSlot ? colorOf(layer.colorSlot) : null
    if (color) {
      const pixels = sctx.getImageData(0, 0, CHARACTER_WIDTH, CHARACTER_HEIGHT)
      recolor(pixels.data, color)
      sctx.putImageData(pixels, 0, 0)
    }
    ctx.drawImage(scratch, 0, 0)
  }
  cache.set(key, result)
  return result
}
