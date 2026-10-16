import { LIFE_SEED, SUN_SPARK, type ItemKind } from '../../api/types'
import { CrystalIcon } from './CrystalIcon'
import { LifeSeedIcon } from './LifeSeedIcon'
import { SeedPacketIcon } from './SeedPacketIcon'
import { SunSparkIcon } from './SunSparkIcon'
import { ToolIcon } from './ToolIcon'

/** Иконка предмета по его ключу, виду и (для осколков) цвету кристалла. */
export function ItemIcon({ itemKey, kind, color, size = 16 }: { itemKey: string; kind?: ItemKind; color?: string | null; size?: number }) {
  if (itemKey === LIFE_SEED) return <LifeSeedIcon size={size} />
  if (itemKey === SUN_SPARK) return <SunSparkIcon size={size} />
  if (kind === 'TOOL') return <ToolIcon size={size} />
  if (color) return <CrystalIcon color={color} size={size} />
  return <SeedPacketIcon size={size} />
}
