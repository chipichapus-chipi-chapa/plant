import { describe, expect, it } from 'vitest'
import { LAMP_LIGHT_UP_MS, lampLevel } from './renderer'

describe('лампа в помещении', () => {
  it('сначала темно, потом фитиль вспыхивает и свет разгорается до конца', () => {
    expect(lampLevel(0)).toBe(0)
    expect(lampLevel(400)).toBe(0)
    // вспышки: то ярче, то тусклее
    expect(lampLevel(500)).toBeGreaterThan(lampLevel(560))
    expect(lampLevel(LAMP_LIGHT_UP_MS)).toBe(1)
    expect(lampLevel(5000)).toBe(1)
  })
})
