import { describe, expect, it } from 'vitest'
import { hoeFrame, isPlaying, strikeLift, WEED_MS, weedParticles, type WeedEffect } from './effects'

const effect: WeedEffect = { kind: 'weed', cell: { x: 3, y: 2 }, at: 1000 }

describe('анимация прополки', () => {
  it('три удара мотыгой: замах — удар, потом мотыгу убирают', () => {
    expect([0, 150, 250, 350, 450, 550].map(hoeFrame)).toEqual(['up', 'down', 'up', 'down', 'up', 'down'])
    expect(hoeFrame(650)).toBeNull()
    // на замахе персонаж выпрямляется, на ударе приседает
    expect(strikeLift(0)).toBe(1)
    expect(strikeLift(150)).toBe(0)
  })

  it('сорняки вылетают только после удара, летят вверх и падают обратно', () => {
    expect(weedParticles(effect, 50)).toHaveLength(0)
    const justHit = weedParticles(effect, 110)
    const later = weedParticles(effect, 400)
    expect(justHit.length).toBeGreaterThan(0)
    const cellTop = 2 * 32
    expect(justHit.every((p) => p.y > cellTop)).toBe(true)
    // через 0,3 с после первого удара клочки уже взлетели выше центра клетки
    expect(later.some((p) => p.y < cellTop + 16)).toBe(true)
  })

  it('одинаковый момент рисуется одинаково и анимация заканчивается', () => {
    expect(weedParticles(effect, 300)).toEqual(weedParticles(effect, 300))
    expect(isPlaying(effect, 1000 + WEED_MS - 1)).toBe(true)
    expect(isPlaying(effect, 1000 + WEED_MS)).toBe(false)
    expect(weedParticles(effect, WEED_MS + 200)).toHaveLength(0)
  })
})
