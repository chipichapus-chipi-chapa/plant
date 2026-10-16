import { describe, expect, it } from 'vitest'
import { directionFor, hexToRgb, lightOf, MASK, mix, recolor, shadeOf } from './character'

describe('перекраска персонажа', () => {
  it('разбирает hex', () => {
    expect(hexToRgb('#c8642e')).toEqual([200, 100, 46])
  })

  it('тень темнее, блик светлее исходного цвета', () => {
    const color = hexToRgb('#5f8a3a')
    expect(shadeOf(color).every((v, i) => v <= color[i] + 4)).toBe(true)
    expect(lightOf(color).every((v, i) => v >= color[i])).toBe(true)
    expect(lightOf([250, 250, 250])).toEqual([255, 255, 255])
  })

  it('смешивает цвета', () => {
    expect(mix([0, 0, 0], [200, 100, 50], 0.5)).toEqual([100, 50, 25])
  })

  it('перекрашивает только маркерные пиксели', () => {
    const data = new Uint8ClampedArray([
      ...MASK.base, 255,
      ...MASK.shade, 255,
      36, 27, 19, 255, // контур — не трогаем
      ...MASK.base, 0, // прозрачный — не трогаем
    ])
    const color = hexToRgb('#4a7fc9')
    recolor(data, color)
    expect(Array.from(data.slice(0, 3))).toEqual(color)
    expect(Array.from(data.slice(4, 7))).toEqual(shadeOf(color))
    expect(Array.from(data.slice(8, 11))).toEqual([36, 27, 19])
    expect(Array.from(data.slice(12, 15))).toEqual(MASK.base)
  })

  it('разворачивается по направлению ходьбы', () => {
    expect(directionFor('down')).toEqual({ direction: 'down', flip: false })
    expect(directionFor('up')).toEqual({ direction: 'up', flip: false })
    expect(directionFor('right')).toEqual({ direction: 'side', flip: false })
    // влево — тот же боковой кадр, отражённый
    expect(directionFor('left')).toEqual({ direction: 'side', flip: true })
  })
})
