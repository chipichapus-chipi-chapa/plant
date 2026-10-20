import { describe, expect, it } from 'vitest'
import atlas from '../../public/assets/atlas.json'

// Карты лежат в backend как контент, атлас — здесь; тест сверяет их между собой.
type Prop = { key: string; kind: string; width: number; height: number }
const maps = Object.values(
  import.meta.glob<{ key: string; props: Prop[] }>('../../../backend/src/main/resources/content/gardens/*.json', { eager: true, import: 'default' }),
)
const frames: Record<string, { w: number; h: number }> = atlas.frames

describe('постройки на картах', () => {
  it('карты нашлись', () => {
    expect(maps.length).toBeGreaterThan(5)
  })

  it('рисунок постройки не шире и не выше её места — иначе он ляжет поверх героя на соседней клетке', () => {
    const oversized = maps.flatMap((map) =>
      map.props
        .filter((p) => {
          const f = frames[`prop_${p.kind}`]
          return f && (f.w > p.width * 32 || f.h > p.height * 32)
        })
        .map((p) => `${map.key}/${p.key}`),
    )
    expect(oversized).toEqual([])
  })
})
