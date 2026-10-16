// Атлас спрайтов: одна картинка + JSON с координатами кадров.
// Сейчас его генерирует scripts/build-placeholder-atlas.mjs; настоящие ассеты
// заменят оба файла, сохранив имена кадров.

export type Frame = { x: number; y: number; w: number; h: number }

export type Atlas = { image: HTMLImageElement; frames: Record<string, Frame> }

// BASE_URL — путь сайта: «/» локально, «/plant/» на GitHub Pages
const BASE = `${import.meta.env.BASE_URL}assets/`

let loading: Promise<Atlas> | null = null

/** Атлас грузится один раз на всю игру; после ошибки следующий вызов пробует снова. */
export function loadAtlas(): Promise<Atlas> {
  loading ??= fetchAtlas().catch((e: unknown) => {
    loading = null
    throw e
  })
  return loading
}

async function fetchAtlas(): Promise<Atlas> {
  const response = await fetch(`${BASE}atlas.json`)
  if (!response.ok) throw new Error(`atlas.json: ${response.status}`)
  const manifest = (await response.json()) as { image: string; frames: Record<string, Frame> }

  const image = new Image()
  image.src = BASE + manifest.image
  await image.decode()
  return { image, frames: manifest.frames }
}

const frameCache = new Map<string, HTMLCanvasElement>()

/** Отдельный кадр атласа как картинка (для портретов и персонажей вне общей сцены). */
export function frameImage(atlas: Atlas, name: string): HTMLCanvasElement | null {
  const cached = frameCache.get(name)
  if (cached) return cached
  const f = atlas.frames[name]
  if (!f) return null
  const canvas = document.createElement('canvas')
  canvas.width = f.w
  canvas.height = f.h
  canvas.getContext('2d')!.drawImage(atlas.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h)
  frameCache.set(name, canvas)
  return canvas
}
