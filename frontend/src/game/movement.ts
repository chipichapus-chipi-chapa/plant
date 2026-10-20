// Ходьба по саду: позиция в логических пикселях (1 тайл = 32), столкновения с клетками,
// клетка «перед персонажем». Без DOM и таймеров — легко тестировать.

import type { GardenMap, GardenObject } from '../api/types'
import { propAt, TILE, tileAt, type Cell } from './layout'

export type Facing = 'up' | 'down' | 'left' | 'right'

/** Позиция ступней персонажа (центр) в логических пикселях и куда он смотрит. */
export type Walker = { x: number; y: number; facing: Facing }

/** Скорость ходьбы, логических пикселей в секунду (~3 клетки). */
export const WALK_SPEED = 96

/** «Ступни» — небольшой прямоугольник, которым персонаж задевает препятствия. */
const FEET = { halfWidth: 6, height: 6 }

const WALKABLE = new Set(['grass', 'weeds', 'path', 'soil', 'overgrown', 'floor', 'bridge', 'rug', 'dreamgrass', 'stardust'])

/**
 * Карта проходимости: забор и постройки непроходимы, как и растения и стоящие персонажи.
 * Пустые грядки проходимы — по ним можно подойти к соседней.
 */
export function blockedCells(map: GardenMap, objects: GardenObject[], standing: Cell[]): boolean[][] {
  const blocked = Array.from({ length: map.height }, (_, y) =>
    Array.from({ length: map.width }, (_, x) => !WALKABLE.has(tileAt(map, x, y)?.type ?? '') || !!propAt(map, x, y)),
  )
  for (const o of objects) blocked[o.y][o.x] = true
  for (const c of standing) blocked[c.y][c.x] = true
  return blocked
}

function isBlocked(blocked: boolean[][], x: number, y: number): boolean {
  const cx = Math.floor(x / TILE)
  const cy = Math.floor(y / TILE)
  return cy < 0 || cx < 0 || cy >= blocked.length || cx >= blocked[0].length || blocked[cy][cx]
}

/** Задевают ли ступни в точке (x, y) что-нибудь непроходимое. */
export function collides(blocked: boolean[][], x: number, y: number): boolean {
  const left = x - FEET.halfWidth
  const right = x + FEET.halfWidth - 0.01
  const top = y - FEET.height
  const bottom = y - 0.01
  return (
    isBlocked(blocked, left, top) ||
    isBlocked(blocked, right, top) ||
    isBlocked(blocked, left, bottom) ||
    isBlocked(blocked, right, bottom)
  )
}

/**
 * Шаг ходьбы на dt секунд в направлении (dx, dy) — вектор длиной до 1 (джойстик даёт и промежуточные).
 * Оси проверяются по отдельности: упёршись в забор по диагонали, персонаж скользит вдоль него.
 */
export function walk(w: Walker, dx: number, dy: number, dt: number, blocked: boolean[][]): Walker {
  const length = Math.hypot(dx, dy)
  if (length < 0.15) return w
  const scale = Math.min(1, length) / length
  const vx = dx * scale * WALK_SPEED * dt
  const vy = dy * scale * WALK_SPEED * dt

  let { x, y } = w
  // Уже стоим в занятой клетке (под ногами посадили растение, рядом встал житель) — выпускаем
  // в любую сторону, иначе каждое направление «сталкивается» и персонаж застревает навсегда.
  const stuck = collides(blocked, x, y)
  if (stuck || !collides(blocked, x + vx, y)) x += vx
  if (stuck || !collides(blocked, x, y + vy)) y += vy
  const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
  return { x, y, facing }
}

/** Клетка, в которой стоит персонаж. */
export function cellOf(w: Walker): Cell {
  return { x: Math.floor(w.x / TILE), y: Math.floor((w.y - 1) / TILE) }
}

/** Клетка перед персонажем — с ней он взаимодействует. */
export function facingCell(w: Walker): Cell {
  const c = cellOf(w)
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[w.facing]
  return { x: c.x + d[0], y: c.y + d[1] }
}

/** Персонаж стоит в клетке: ступни по центру клетки, у нижнего края. */
export function walkerAt(cell: Cell, facing: Facing = 'down'): Walker {
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE - 2, facing }
}
