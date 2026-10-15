import { describe, expect, it } from 'vitest'
import { newIdempotencyKey } from './idempotency'

describe('newIdempotencyKey', () => {
  it('выдаёт разные UUID', () => {
    const a = newIdempotencyKey()
    const b = newIdempotencyKey()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a).not.toBe(b)
  })
})
