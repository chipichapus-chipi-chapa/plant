import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { GardenMap, GardenObject } from '../api/types'
import type { Atlas } from './atlas'
import { cellAtPoint, fitScale, inBounds, TILE, type Cell } from './layout'
import { Fireflies } from './Fireflies'
import { drawGarden } from './renderer'
import styles from './GardenCanvas.module.css'

/** Сколько высоты экрана занято вокруг сада: шапка, табличка о клетке, панель кнопок. */
const RESERVED_HEIGHT = 300

type Props = {
  map: GardenMap
  objects: GardenObject[]
  awakened: ReadonlySet<string>
  /** Постройки, над которыми мерцает искра (там ещё можно что-то найти) */
  sparkles: ReadonlySet<string>
  atlas: Atlas
  selected: Cell | null
  onSelect: (cell: Cell | null) => void
}

/**
 * Канвас сада. React владеет состоянием (выбранная клетка), канвас только рисует.
 * Масштаб подбирается под экран (до ×3) без сглаживания; плотность экрана (devicePixelRatio)
 * учитывается в размере буфера. Сцена сначала рисуется 1:1 во внеэкранный канвас, затем переносится целиком.
 */
export function GardenCanvas({ map, objects, awakened, sparkles, atlas, selected, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Сцена рисуется в буфер 1:1 (512×320), а на экран переносится одним масштабированием.
  // Иначе при дробном масштабе между тайлами появляются швы.
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const [scale, setScale] = useState(1)
  const [hover, setHover] = useState<Cell | null>(null)

  // Подбираем масштаб под ширину контейнера и высоту окна: шапка, табличка
  // и панель действий должны помещаться на экране без прокрутки
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const update = () => setScale(fitScale(wrap.clientWidth, map, window.innerHeight - RESERVED_HEIGHT))
    const observer = new ResizeObserver(update)
    observer.observe(wrap)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
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

    const buffer = (bufferRef.current ??= document.createElement('canvas'))
    buffer.width = map.width * TILE
    buffer.height = map.height * TILE
    const bufferCtx = buffer.getContext('2d')
    if (!bufferCtx) return
    drawGarden(bufferCtx, map, objects, atlas, { hover, selected }, awakened, sparkles)

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height)
  }, [map, objects, awakened, sparkles, atlas, scale, hover, selected])

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
      <div className={styles.stage}>
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
        <Fireflies />
      </div>
    </div>
  )
}
