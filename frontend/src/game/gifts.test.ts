import { describe, expect, it } from 'vitest'
import { person, thanksDialogue } from './gifts'

describe('подарки', () => {
  it('Агата в городке и дома — один человек', () => {
    expect(person('agata')).toBe('agata')
    expect(person('agata-home')).toBe('agata')
    expect(person('khmur-glade')).toBe('khmur')
  })

  it('за любой подарок — благодарность', () => {
    expect(thanksDialogue('Роза').nodes.a.text).toContain('«Роза»')
  })
})
