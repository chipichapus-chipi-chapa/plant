import { describe, expect, it } from 'vitest'
import type { GardenMap } from '../api/types'
import { fogBand, fogCleared, fogDensity, fogTalk, notchesLine } from './fog'

const lake = {
  key: 'lake',
  fog: { after: 'myata_garden', days: 7, speaker: 'tish', talks: ['thick', 'thin', 'clear'], notches: 'dock' },
} as unknown as GardenMap
const fog = (days: number, started = true) => ({ map: 'lake', started, days, needed: 7 })

describe('туман над озером', () => {
  it('сплошной, пока сад поместья спит, и редеет день за днём', () => {
    expect(fogDensity(fog(0, false), 'lake')).toBe(1)
    expect(fogDensity(fog(0), 'lake')).toBe(1)
    expect(fogDensity(fog(7), 'lake')).toBe(0)
    expect(fogDensity(fog(3), 'lake')).toBeCloseTo(4 / 7)
    expect(fogDensity(fog(3), 'manor')).toBe(0) // над другими локациями тумана нет
  })

  it('густой → редеет с половины пути → рассеялся', () => {
    expect(fogBand(fog(3))).toBe(0)
    expect(fogBand(fog(4))).toBe(1)
    expect(fogBand(fog(7))).toBe(2)
    expect(fogCleared(fog(7))).toBe(true)
    expect(fogCleared(fog(7, false))).toBe(false)
  })

  it('Тишь сразу рассказывает новость, которую ещё не слышали', () => {
    expect(fogTalk('tish', lake, fog(4), 0, 0.9)).toBe('thin')
    expect(fogTalk('tish', lake, fog(4), null, 0.9)).toBe('thin')
    expect(fogTalk('tish', lake, fog(4), 1, 0.9)).toBeNull() // уже слышали — обычный разговор
    expect(fogTalk('tish', lake, fog(4), 1, 0.1)).toBe('thin')
    expect(fogTalk('shurshik', lake, fog(4), null, 0.1)).toBeNull()
    expect(fogTalk('tish', lake, fog(0, false), null, 0.1)).toBeNull()
  })

  it('на причале появляются зарубки', () => {
    expect(notchesLine('dock', lake, fog(2))).toContain('2 из 7')
    expect(notchesLine('dock', lake, fog(7))).toContain('лодку')
    expect(notchesLine('dock', lake, fog(0, false))).toBeNull()
    expect(notchesLine('lake-sign', lake, fog(2))).toBeNull()
  })
})
