// Чистая геометрия сада: какой кадр рисовать в клетке, что лежит в клетке,
// какая клетка под курсором. Без DOM — поэтому легко тестируется.

import type { GardenMap, GardenObject, GardenProp, TileType } from '../api/types'

export const TILE = 32

/** Ключ домашнего сада: здесь стоит Вереск и растут посадки. */
export const HOME = 'home'

export type Cell = { x: number; y: number }

/** Где стоит персонаж игрока: на тропинке у двери сарая. */
export const PLAYER_SPOT: Cell = { x: 12, y: 4 }

/** Где стоит Мастер Вереск: на тропинке между грядками и чашей. */
export const MENTOR_SPOT: Cell = { x: 10, y: 5 }

export function tileAt(map: GardenMap, x: number, y: number): TileType | undefined {
  return map.tiles[map.rows[y]?.[x] ?? '']
}

export function inBounds(map: GardenMap, cell: Cell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height
}

/** Постройка, которая накрывает клетку (если есть). */
export function propAt(map: GardenMap, x: number, y: number): GardenProp | undefined {
  return map.props.find((p) => x >= p.x && y >= p.y && x < p.x + p.width && y < p.y + p.height)
}

/** Стабильный «случайный» номер варианта для клетки: один и тот же при каждой отрисовке. */
export function variant(x: number, y: number, count: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) % count
}

const isFence = (map: GardenMap, x: number, y: number) => {
  const type = tileAt(map, x, y)?.type
  return type === 'fence' || type === 'gate'
}

/** Маска соседей того же типа: север=1, восток=2, юг=4, запад=8. */
export function neighbourMask(map: GardenMap, x: number, y: number, type: string): number {
  const same = (dx: number, dy: number) => tileAt(map, x + dx, y + dy)?.type === type
  return (same(0, -1) ? 1 : 0) | (same(1, 0) ? 2 : 0) | (same(0, 1) ? 4 : 0) | (same(-1, 0) ? 8 : 0)
}

/**
 * Карта сада с учётом изменений игрока: прополотая заросшая грядка («S») становится обычной («s»).
 * Дальше всё — отрисовка, проходимость, посадка — работает с этой картой как с обычной.
 */
export function withWeeded(map: GardenMap, weeded: Cell[]): GardenMap {
  if (weeded.length === 0) return map
  const soil = Object.entries(map.tiles).find(([, t]) => t.type === 'soil')?.[0]
  if (!soil) return map
  const rows = map.rows.map((row) => row.split(''))
  for (const { x, y } of weeded) {
    if (map.tiles[rows[y]?.[x] ?? '']?.type === 'overgrown') rows[y][x] = soil
  }
  return { ...map, rows: rows.map((r) => r.join('')) }
}

/**
 * Карта с оживлением: клетки, у которых в легенде есть revive, превращаются в другой символ,
 * когда их постройка пробуждена (засохшие клумбы расцветают, когда в колодце снова вода).
 */
export function withRevived(map: GardenMap, awakened: ReadonlySet<string>): GardenMap {
  const changes = Object.entries(map.tiles).filter(([, t]) => t.revive && awakened.has(t.revive.when))
  if (changes.length === 0) return map
  const swap = new Map(changes.map(([symbol, t]) => [symbol, t.revive!.tile]))
  return { ...map, rows: map.rows.map((row) => row.split('').map((c) => swap.get(c) ?? c).join('')) }
}

/** Кадр атласа для клетки. Забор выбирает кусок по соседям: горизонтальный, вертикальный или столб в углу. */
export function tileFrame(map: GardenMap, x: number, y: number): string {
  const type = tileAt(map, x, y)?.type ?? 'grass'
  switch (type) {
    case 'fence': {
      const horizontal = isFence(map, x - 1, y) || isFence(map, x + 1, y)
      const vertical = isFence(map, x, y - 1) || isFence(map, x, y + 1)
      if (horizontal && vertical) return 'fence_post'
      return horizontal ? 'fence_h' : 'fence_v'
    }
    case 'gate':
      // калитка-тайл (в старых картах); в домашнем саду калитка — постройка
      return 'prop_gate'
    case 'weeds':
      return `weeds_${variant(x, y, 3)}`
    case 'forest': {
      // за краем карты лес продолжается — опушка рисуется только там, где рядом поляна
      const forestAt = (dx: number, dy: number) => !inBounds(map, { x: x + dx, y: y + dy }) || tileAt(map, x + dx, y + dy)?.type === 'forest'
      return `forest_${(forestAt(0, -1) ? 1 : 0) | (forestAt(1, 0) ? 2 : 0) | (forestAt(0, 1) ? 4 : 0) | (forestAt(-1, 0) ? 8 : 0)}`
    }
    case 'water': {
      // мост — тоже вода под досками: берег у ручья только там, где рядом суша
      const wet = (dx: number, dy: number) => ['water', 'bridge'].includes(tileAt(map, x + dx, y + dy)?.type ?? '')
      return `water_${(wet(0, -1) || y === 0 ? 1 : 0) | (wet(1, 0) ? 2 : 0) | (wet(0, 1) || y === map.height - 1 ? 4 : 0) | (wet(-1, 0) ? 8 : 0)}`
    }
    case 'bridge':
      return 'bridge'
    case 'flowers':
      return `flowers_${variant(x, y, 3)}`
    case 'moonflowers':
      return `moonflowers_${variant(x, y, 3)}`
    case 'dreamgrass':
      return `dreamgrass_${variant(x, y, 3)}`
    case 'stardust':
      return `stardust_${variant(x, y, 2)}`
    case 'glowshrooms':
      return `glowshrooms_${variant(x, y, 3)}`
    case 'starwater':
      return `starwater_${variant(x, y, 3)}`
    case 'dry_bed':
      return `dry_bed_${variant(x, y, 3)}`
    case 'reeds':
      return `reeds_${variant(x, y, 3)}`
    case 'rug':
      return `rug_${neighbourMask(map, x, y, 'rug')}`
    case 'floor':
      // пол по соседям: у стен темнеет, в углах комнаты срезан — комната получается восьмиугольной
      return `floor_${neighbourMask(map, x, y, 'floor')}`
    case 'wall':
      // стена — чёрная пустота, а со стороны пола у неё каменная кромка
      return `wall_${neighbourMask(map, x, y, 'floor')}`
    case 'path':
    case 'bed':
    case 'moss_bed':
    case 'soil':
    case 'overgrown':
      // кадр по соседям того же типа: где соседа нет — трава наползает на тропу, у грядки бортик
      return `${type}_${neighbourMask(map, x, y, type)}`
    default:
      return `grass_${variant(x, y, 4)}`
  }
}

/** Клетка под точкой в CSS-пикселях канваса при данном масштабе. */
export function cellAtPoint(px: number, py: number, scale: number): Cell {
  return { x: Math.floor(px / (TILE * scale)), y: Math.floor(py / (TILE * scale)) }
}

/**
 * Масштаб сада под доступную ширину и высоту (не больше ×4, не меньше ×0.25).
 * Масштаб дробный: на обычном ноутбуке целый ×1 оставил бы сад крошечным, а ×2 не влез бы.
 * Сцена рисуется в буфер 1:1 и растягивается без сглаживания, поэтому пиксели остаются чёткими,
 * лишь часть из них на экранный пиксель шире соседних.
 */
export function fitScale(availableWidth: number, map: GardenMap, availableHeight = Infinity): number {
  const fit = Math.min(availableWidth / (map.width * TILE), availableHeight / (map.height * TILE))
  return Math.max(0.25, Math.min(4, fit))
}

/**
 * Масштаб «на весь экран»: локация целиком входит в окно и занимает его по большей стороне.
 * Если пропорции карты и экрана не совпадают, по краям остаются тёмные поля.
 */
export function containScale(width: number, height: number, map: GardenMap): number {
  if (width <= 0 || height <= 0) return 1
  return Math.min(width / (map.width * TILE), height / (map.height * TILE))
}

/**
 * Камера: левый верхний угол видимой части карты (в логических пикселях). Герой — по центру,
 * но камера не заезжает за края карты. Если карта меньше окна, она стоит по центру
 * (камера уходит в минус — это ширина тёмного поля). Округляем до целого пикселя, чтобы картинка не дрожала.
 */
export function cameraAt(
  focus: { x: number; y: number },
  view: { width: number; height: number },
  map: GardenMap,
): { x: number; y: number } {
  const clamp = (v: number, max: number) => Math.round(max < 0 ? max / 2 : Math.min(Math.max(0, v), max))
  return {
    x: clamp(focus.x - view.width / 2, map.width * TILE - view.width),
    y: clamp(focus.y - view.height / 2, map.height * TILE - view.height),
  }
}

/** Что показать игроку о клетке: постройка важнее тайла под ней. */
export function describeCell(map: GardenMap, cell: Cell): { name: string; description: string; plantable: boolean } | null {
  if (!inBounds(map, cell)) return null
  const prop = propAt(map, cell.x, cell.y)
  if (prop) return { name: prop.name, description: prop.description, plantable: false }
  const tile = tileAt(map, cell.x, cell.y)
  return tile ? { name: tile.name, description: tile.description, plantable: tile.plantable } : null
}

export function objectAt(objects: GardenObject[], cell: Cell): GardenObject | undefined {
  return objects.find((o) => o.x === cell.x && o.y === cell.y)
}

/** Через сколько минут следующая стадия (округляем вверх, минимум 1). null — растение взрослое. */
export function minutesUntilNextStage(object: GardenObject, now: number): number | null {
  if (!object.nextStageAt) return null
  return Math.max(1, Math.ceil((Date.parse(object.nextStageAt) - now) / 60_000))
}

/** Когда перечитать состояние, чтобы увидеть ближайшую смену стадии (мс от now), или null. */
export function nextGrowthRefresh(objects: GardenObject[], now: number): number | null {
  const times = objects.filter((o) => o.nextStageAt).map((o) => Date.parse(o.nextStageAt!))
  if (times.length === 0) return null
  return Math.max(1000, Math.min(...times) - now + 500)
}
