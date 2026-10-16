import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { GardenMap } from '../api/types'
import type { Atlas } from './atlas'
import { directionFor, type CharacterFrames } from './character'
import { Fireflies } from './Fireflies'
import { cellAtPoint, fitScale, inBounds, TILE, type Cell } from './layout'
import { blockedCells, cellOf, facingCell, walk, walkerAt, type Facing, type Walker } from './movement'
import { isPlaying, strikeLift } from './effects'
import { drawGarden, LAMP_LIGHT_UP_MS, lampLevel, type Scene } from './renderer'
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
  /** Кадры игрока по направлениям и фазам шага */
  player: { frames: CharacterFrames; start: Cell; facing?: Facing }
  onSelect: (cell: Cell | null) => void
  /** Персонаж перешёл в другую клетку или повернулся к другой клетке */
  onPlayerMove: (at: Cell, facing: Cell) => void
  /** Клавиша действия (E / пробел / Enter) или кнопка ✋ на телефоне */
  onAction: () => void
  /** false — открыто окно или разговор: персонаж стоит, клавиши не перехватываются */
  inputEnabled: boolean
  /** Помещение: при входе сначала темно, потом зажигается лампа */
  lightUp?: boolean
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const coarsePointer = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

/** На сколько пикселей надо провести пальцем, чтобы это считалось ходьбой, а не касанием клетки. */
const DRAG_THRESHOLD = 10
/** Отклонение пальца, при котором персонаж идёт в полную скорость. */
const STICK_RADIUS = 48

/** Цикл шага: левая — стоит — правая — стоит; фаза длится STEP_MS. */
const WALK_CYCLE = [1, 0, 2, 0] as const
const STEP_MS = 130

/** Кадр под направление взгляда: влево — боковой кадр, отражённый. */
function frameFor(frames: CharacterFrames, facing: Facing, step: number) {
  const { direction, flip } = directionFor(facing)
  return { image: frames[direction][step], flip }
}

/** Пока персонаж полет, он приседает в такт ударам мотыги. */
function workLift(scene: Scene, time: number): number {
  const effect = scene.effects?.find((e) => isPlaying(e, time))
  return effect ? strikeLift(time - effect.at) : 0
}

const scanlineCache = new Map<number, CanvasPattern | null>()

/** Строки «старого монитора» поверх сцены, как в Inscryption: тонкая тёмная линия через каждые 3 экранных пикселя. */
function scanlines(ctx: CanvasRenderingContext2D, period: number): CanvasPattern | null {
  if (!scanlineCache.has(period)) {
    const tile = document.createElement('canvas')
    tile.width = 1
    tile.height = period
    const t = tile.getContext('2d')!
    t.fillStyle = 'rgba(0, 0, 0, 0.22)'
    t.fillRect(0, period - 1, 1, 1)
    scanlineCache.set(period, ctx.createPattern(tile, 'repeat'))
  }
  return scanlineCache.get(period) ?? null
}

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
  const walkerRef = useRef<Walker>(walkerAt(player.start, player.facing))
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
  }, [scene, atlas, scale, player.frames])

  // Невидимый джойстик на телефоне: ведёшь пальцем по саду — персонаж идёт в ту сторону
  const touchRef = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null)
  const lastPointerWasTouch = useRef(false)

  // Масштаб под ширину контейнера и высоту окна
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    // поле игры задаёт высоту обёртки; если её нет (старая раскладка) — берём высоту окна
    const update = () => setScale(fitScale(wrap.clientWidth, map, wrap.clientHeight || window.innerHeight - RESERVED_HEIGHT))
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
    // холст создаётся заново при входе в локацию — отсюда и отсчёт «зажигания лампы»
    const enteredAt = performance.now()

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

      // «!» над целью задания покачивается — пока он виден, кадр перерисовывается постоянно
      const lighting = !!p.lightUp && now - enteredAt < LAMP_LIGHT_UP_MS + 50
      const working = (p.scene.effects ?? []).some((e) => isPlaying(e, now))
      // мыши иногда шевелят ушами — пока они в локации, кадр перерисовывается постоянно
      const lively = p.scene.characters.some((c) => c.idle)
      const animated = !!p.scene.marker || lighting || working || lively
      if (moving || animated || dirtyRef.current) {
        dirtyRef.current = moving // после остановки нарисуем ещё один кадр — без подпрыгивания
        draw(moving ? WALK_CYCLE[Math.floor(now / STEP_MS) % WALK_CYCLE.length] : 0, now)
      }
      frame = requestAnimationFrame(tick)
    }

    const draw = (step: number, time: number) => {
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
      // размер задаём только при смене карты: присваивание width пересоздаёт холст и стоит заметно
      if (buffer.width !== p.map.width * TILE || buffer.height !== p.map.height * TILE) {
        buffer.width = p.map.width * TILE
        buffer.height = p.map.height * TILE
      }
      const bufferCtx = buffer.getContext('2d')
      if (!bufferCtx) return

      const w = walkerRef.current
      const scene: Scene = {
        ...p.scene,
        time,
        lightLevel: p.lightUp ? lampLevel(time - enteredAt) : 1,
        // вокруг игрока мягкий ореол: в сумерках его всегда видно
        aura: { x: w.x, y: w.y },
        characters: [
          ...p.scene.characters,
          // на шаге тело чуть приподнимается — походка пружинит
          { px: w.x, py: w.y, ...frameFor(p.player.frames, w.facing, step), lift: step ? 1 : workLift(p.scene, time) },
        ],
      }
      drawGarden(bufferCtx, p.map, p.atlas, scene)

      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height)
      const lines = scanlines(ctx, Math.max(2, Math.round(dpr * 3)))
      if (lines) {
        ctx.fillStyle = lines
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
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
          className={touch ? `${styles.canvas} ${styles.touch}` : styles.canvas}
          tabIndex={0}
          aria-label={`${map.name}. Стрелки или WASD — идти, E или пробел — действие, клик — рассмотреть клетку.`}
          onPointerDown={(e) => {
            lastPointerWasTouch.current = e.pointerType === 'touch'
            if (e.pointerType !== 'touch' || touchRef.current || !inputEnabled) return
            touchRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false }
          }}
          onPointerUp={(e) => {
            const t = touchRef.current
            if (!t || t.id !== e.pointerId) return
            touchRef.current = null
            stickRef.current = { dx: 0, dy: 0 }
            if (!t.dragging) onSelect(cellFromEvent(e)) // короткое касание — рассмотреть клетку
          }}
          onPointerCancel={(e) => {
            if (touchRef.current?.id !== e.pointerId) return
            touchRef.current = null
            stickRef.current = { dx: 0, dy: 0 }
          }}
          onPointerMove={(e) => {
            // ведёт палец — персонаж идёт; мышь клетки не подсвечивает: о клетке скажет «!» и табличка
            const t = touchRef.current
            if (!t || t.id !== e.pointerId) return
            const dx = e.clientX - t.x
            const dy = e.clientY - t.y
            if (Math.hypot(dx, dy) > DRAG_THRESHOLD) t.dragging = true
            if (t.dragging) stickRef.current = { dx: dx / STICK_RADIUS, dy: dy / STICK_RADIUS }
          }}
          onClick={(e) => {
            // касания обрабатываются в onPointerUp (там отличаем ходьбу от касания клетки)
            if (!lastPointerWasTouch.current) onSelect(cellFromEvent(e))
          }}
        />
        <Fireflies />
        {touch && inputEnabled && (
          <button
            type="button"
            className={styles.action}
            aria-label="Действие"
            onClick={() => latest.current.onAction()}
          >
            <span aria-hidden="true">✋</span>
          </button>
        )}
      </div>
    </div>
  )
}
