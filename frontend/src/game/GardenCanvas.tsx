import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { GardenMap } from '../api/types'
import type { Atlas } from './atlas'
import { directionFor, type CharacterFrames } from './character'
import { useSettings } from '../app/settings'
import { Fireflies } from './Fireflies'
import { cameraAt, containScale, inBounds, TILE, type Cell } from './layout'
import { blockedCells, cellOf, facingCell, walk, walkerAt, type Facing, type Walker } from './movement'
import { isPlaying, strikeLift } from './effects'
import { drawGarden, LAMP_LIGHT_UP_MS, lampLevel, type Scene } from './renderer'
import styles from './GardenCanvas.module.css'

/** Поля вокруг локации — как сумерки в саду (--c-night) */
const LETTERBOX = '#120e0d'


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

/** Пока герой стоит, анимации перерисовываются не чаще ~30 раз в секунду. */
const IDLE_FRAME_MS = 32

/**
 * Во сколько раз холст детальнее CSS-пикселей. Пиксель-арт крупный, лишняя чёткость ему не нужна,
 * а на телефоне (плотность ×3) холст в 9 раз больше — это и тормозило. Телефону хватает ×1, компьютеру — до ×2.
 */
function renderScale(): number {
  const dpr = window.devicePixelRatio || 1
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return Math.min(dpr, coarse ? 1 : 2)
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
  // размер поля в CSS-пикселях; масштаб — «на весь экран», лишнее показывает камера
  const [size, setSize] = useState({ width: 0, height: 0 })
  const scale = containScale(size.width, size.height, map)
  const cameraRef = useRef({ x: 0, y: 0 })
  const sizeRef = useRef(size)
  const [touch] = useState(coarsePointer)
  // настройки вида: сумерки, строки монитора, светлячки — игровой цикл читает их из ref
  const { settings } = useSettings()
  const look = useRef(settings)

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
    look.current = settings
    latest.current = props
    scaleRef.current = scale
    sizeRef.current = size
    blockedRef.current = blocked
  })

  // Любое изменение входных данных — повод перерисовать кадр
  useEffect(() => {
    dirtyRef.current = true
  }, [scene, atlas, scale, size, player.frames, settings])

  // Невидимый джойстик на телефоне: ведёшь пальцем по саду — персонаж идёт в ту сторону
  const touchRef = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null)
  const lastPointerWasTouch = useRef(false)

  // Поле игры занимает всё окно: меряем его и подбираем масштаб так, чтобы сад заполнил экран
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const update = () => setSize({ width: wrap.clientWidth, height: wrap.clientHeight })
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
    let lastDraw = 0
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
      // пока герой стоит, анимации (уши мышей, туман, «!») хватает 30 кадров в секунду — телефону легче
      const due = moving || dirtyRef.current || now - lastDraw >= IDLE_FRAME_MS
      if ((moving || animated || dirtyRef.current) && due) {
        dirtyRef.current = moving // после остановки нарисуем ещё один кадр — без подпрыгивания
        lastDraw = now
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
      const dpr = renderScale()
      const cssWidth = Math.floor(sizeRef.current.width)
      const cssHeight = Math.floor(sizeRef.current.height)
      if (cssWidth === 0 || cssHeight === 0) return
      if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
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
        dim: look.current.brightness === 'soft' ? 0.55 : 1,
        // вокруг игрока мягкий ореол: в сумерках его всегда видно
        aura: { x: w.x, y: w.y },
        characters: [
          ...p.scene.characters,
          // на шаге тело чуть приподнимается — походка пружинит
          { px: w.x, py: w.y, ...frameFor(p.player.frames, w.facing, step), lift: step ? 1 : workLift(p.scene, time) },
        ],
      }
      drawGarden(bufferCtx, p.map, p.atlas, scene)

      // камера: карта целиком и по центру; тёмные поля по краям — если пропорции не совпали
      const view = { width: cssWidth / s, height: cssHeight / s }
      const camera = cameraAt({ x: w.x, y: w.y - TILE / 2 }, view, p.map)
      cameraRef.current = camera
      const k = s * dpr
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = LETTERBOX
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(buffer, Math.round(-camera.x * k), Math.round(-camera.y * k), Math.round(buffer.width * k), Math.round(buffer.height * k))
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const cellFromEvent = (event: MouseEvent<HTMLCanvasElement>): Cell | null => {
    // экранная точка → точка карты с учётом камеры → клетка
    const rect = event.currentTarget.getBoundingClientRect()
    const x = cameraRef.current.x + (event.clientX - rect.left) / scale
    const y = cameraRef.current.y + (event.clientY - rect.top) / scale
    const cell = { x: Math.floor(x / TILE), y: Math.floor(y / TILE) }
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
        {/* строки «старого монитора», как в Inscryption: обычный CSS-слой, а не перерисовка каждого кадра */}
        {settings.scanlines && <div className={styles.scanlines} aria-hidden="true" />}
        {settings.fireflies && <Fireflies />}
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
