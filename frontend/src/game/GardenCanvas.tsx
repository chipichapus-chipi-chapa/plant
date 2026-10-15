import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { GardenMap } from '../api/types'
import type { Atlas } from './atlas'
import { Fireflies } from './Fireflies'
import { Joystick } from './Joystick'
import { cellAtPoint, fitScale, inBounds, TILE, type Cell } from './layout'
import { blockedCells, cellOf, facingCell, walk, walkerAt, type Walker } from './movement'
import { drawGarden, type Scene } from './renderer'
import styles from './GardenCanvas.module.css'

/** Сколько высоты экрана занято вокруг сада: шапка, табличка о клетке, панель кнопок. */
const RESERVED_HEIGHT = 300

const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
}
const ACTION_KEYS = new Set(['KeyE', 'Space', 'Enter'])

type Props = {
  map: GardenMap
  /** Растения, пробуждённые объекты, мерцания, неподвижные персонажи (наставник) */
  scene: Scene
  /** Клетки, где стоят неподвижные персонажи: сквозь них не пройти */
  standing: Cell[]
  atlas: Atlas
  player: { image: CanvasImageSource; start: Cell }
  selected: Cell | null
  onSelect: (cell: Cell | null) => void
  /** Персонаж перешёл в другую клетку или повернулся к другой клетке */
  onPlayerMove: (at: Cell, facing: Cell) => void
  /** Клавиша действия (E / пробел / Enter) или кнопка ✋ на телефоне */
  onAction: () => void
  /** false — открыто окно или разговор: персонаж стоит, клавиши не перехватываются */
  inputEnabled: boolean
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const coarsePointer = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

/**
 * Канвас сада с игровым циклом. Каждый кадр: ввод (клавиатура или джойстик) → шаг ходьбы
 * с учётом препятствий → отрисовка, но только если что-то изменилось.
 * Сцена рисуется в буфер 1:1 и переносится на экран одним масштабированием, без сглаживания.
 */
export function GardenCanvas(props: Props) {
  const { map, scene, standing, atlas, player, onSelect, inputEnabled } = props
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<HTMLCanvasElement | null>(null)
  const [scale, setScale] = useState(1)
  const [touch] = useState(coarsePointer)

  // Всё, что читает игровой цикл, лежит в ref: цикл не перезапускается на каждый рендер React
  const latest = useRef(props)
  const walkerRef = useRef<Walker>(walkerAt(player.start))
  const hoverRef = useRef<Cell | null>(null)
  const keysRef = useRef(new Set<string>())
  const stickRef = useRef({ dx: 0, dy: 0 })
  const dirtyRef = useRef(true)
  const scaleRef = useRef(scale)

  const blocked = useMemo(() => blockedCells(map, scene.objects, standing), [map, scene.objects, standing])
  const blockedRef = useRef(blocked)

  // Свежие значения для игрового цикла — после каждого рендера
  useLayoutEffect(() => {
    latest.current = props
    scaleRef.current = scale
    blockedRef.current = blocked
  })

  // Любое изменение входных данных — повод перерисовать кадр
  useEffect(() => {
    dirtyRef.current = true
  }, [scene, atlas, scale, props.selected, player.image])

  // Масштаб под ширину контейнера и высоту окна
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

  // Клавиатура: стрелки/WASD — идти, E/пробел/Enter — действие. В полях ввода и при открытых окнах не мешаем.
  useEffect(() => {
    const keys = keysRef.current
    if (!inputEnabled) {
      keys.clear()
      return
    }
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return
      if (KEYS[e.code]) {
        e.preventDefault()
        keys.add(e.code)
      } else if (ACTION_KEYS.has(e.code) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        if (!e.repeat) latest.current.onAction()
      }
    }
    const up = (e: KeyboardEvent) => keys.delete(e.code)
    const blur = () => keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [inputEnabled])

  // Игровой цикл
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let lastCell = cellOf(walkerRef.current)
    let lastFacing = facingCell(walkerRef.current)
    latest.current.onPlayerMove(lastCell, lastFacing)

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const p = latest.current

      let dx = stickRef.current.dx
      let dy = stickRef.current.dy
      for (const code of keysRef.current) {
        dx += KEYS[code][0]
        dy += KEYS[code][1]
      }
      const moving = p.inputEnabled && Math.hypot(dx, dy) >= 0.15
      if (moving) {
        walkerRef.current = walk(walkerRef.current, dx, dy, dt, blockedRef.current)
        const cell = cellOf(walkerRef.current)
        const facing = facingCell(walkerRef.current)
        if (cell.x !== lastCell.x || cell.y !== lastCell.y || facing.x !== lastFacing.x || facing.y !== lastFacing.y) {
          lastCell = cell
          lastFacing = facing
          p.onPlayerMove(cell, facing)
        }
      }

      if (moving || dirtyRef.current) {
        dirtyRef.current = moving // после остановки нарисуем ещё один кадр — без подпрыгивания
        draw(moving ? Math.floor(now / 140) % 2 : 0)
      }
      frame = requestAnimationFrame(tick)
    }

    const draw = (lift: number) => {
      const p = latest.current
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const s = scaleRef.current
      const dpr = window.devicePixelRatio || 1
      const cssWidth = Math.floor(p.map.width * TILE * s)
      const cssHeight = Math.floor(p.map.height * TILE * s)
      if (canvas.width !== Math.round(cssWidth * dpr)) {
        canvas.width = Math.round(cssWidth * dpr)
        canvas.height = Math.round(cssHeight * dpr)
        canvas.style.width = `${cssWidth}px`
        canvas.style.height = `${cssHeight}px`
      }
      const buffer = (bufferRef.current ??= document.createElement('canvas'))
      buffer.width = p.map.width * TILE
      buffer.height = p.map.height * TILE
      const bufferCtx = buffer.getContext('2d')
      if (!bufferCtx) return

      const w = walkerRef.current
      const scene: Scene = {
        ...p.scene,
        characters: [
          ...p.scene.characters,
          { px: w.x, py: w.y, image: p.player.image, flip: w.facing === 'left', lift },
        ],
      }
      drawGarden(bufferCtx, p.map, p.atlas, scene, { hover: hoverRef.current, selected: p.selected })

      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const cellFromEvent = (event: MouseEvent<HTMLCanvasElement>): Cell | null => {
    const rect = event.currentTarget.getBoundingClientRect()
    const cell = cellAtPoint(event.clientX - rect.left, event.clientY - rect.top, scale)
    return inBounds(map, cell) ? cell : null
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          aria-label={`${map.name}. Стрелки или WASD — идти, E или пробел — действие, клик — рассмотреть клетку.`}
          onPointerMove={(e) => {
            const cell = cellFromEvent(e)
            const hover = hoverRef.current
            if (cell?.x !== hover?.x || cell?.y !== hover?.y) {
              hoverRef.current = cell
              dirtyRef.current = true
            }
          }}
          onPointerLeave={() => {
            hoverRef.current = null
            dirtyRef.current = true
          }}
          onClick={(e) => onSelect(cellFromEvent(e))}
        />
        <Fireflies />
      </div>
      {/* На телефоне — панель управления под садом, чтобы не закрывать его пальцами */}
      {touch && inputEnabled && (
        <Joystick
          onMove={(dx, dy) => {
            stickRef.current = { dx, dy }
          }}
          onAction={() => latest.current.onAction()}
        />
      )}
    </div>
  )
}
