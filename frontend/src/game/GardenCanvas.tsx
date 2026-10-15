import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { GardenMap } from '../api/types'
import type { Atlas } from './atlas'
import { cellAtPoint, fitScale, inBounds, TILE, type Cell } from './layout'
import { drawGarden } from './renderer'
import styles from './GardenCanvas.module.css'

type Props = {
  map: GardenMap
  atlas: Atlas
  selected: Cell | null
  onSelect: (cell: Cell | null) => void
}

/**
 * Канвас сада. React владеет состоянием (выбранная клетка), канвас только рисует.
 * Масштаб целый (×1/×2/×3), чтобы пиксели не размывались (на телефоне — дробный); плотность экрана (devicePixelRatio)
 * учитывается в размере буфера.
 */
export function GardenCanvas({ map, atlas, selected, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [hover, setHover] = useState<Cell | null>(null)

  // Подбираем масштаб под ширину контейнера
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const observer = new ResizeObserver(([entry]) => setScale(fitScale(entry.contentRect.width, map)))
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [map])

  // Перерисовка при любом изменении входных данных
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const cssWidth = Math.floor(map.width * TILE * scale)
    const cssHeight = Math.floor(map.height * TILE * scale)
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0)
    drawGarden(ctx, map, atlas, { hover, selected })
  }, [map, atlas, scale, hover, selected])

  const cellFromEvent = (event: MouseEvent<HTMLCanvasElement>): Cell | null => {
    const rect = event.currentTarget.getBoundingClientRect()
    const cell = cellAtPoint(event.clientX - rect.left, event.clientY - rect.top, scale)
    return inBounds(map, cell) ? cell : null
  }

  const sameCell = (a: Cell | null, b: Cell | null) => a?.x === b?.x && a?.y === b?.y

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    if (event.key === 'Escape') {
      onSelect(null)
      return
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    const from = selected ?? { x: Math.floor(map.width / 2), y: Math.floor(map.height / 2) }
    const next = { x: from.x + move[0], y: from.y + move[1] }
    onSelect(inBounds(map, next) ? next : from)
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label={`${map.name}. Стрелки — выбрать клетку, Escape — снять выбор.`}
        onPointerMove={(e) => {
          const cell = cellFromEvent(e)
          if (!sameCell(cell, hover)) setHover(cell)
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const cell = cellFromEvent(e)
          onSelect(sameCell(cell, selected) ? null : cell)
        }}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
