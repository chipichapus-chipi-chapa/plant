// Атлас спрайтов: одна картинка + JSON с координатами кадров.
// Сейчас его генерирует scripts/build-placeholder-atlas.mjs; настоящие ассеты
// заменят оба файла, сохранив имена кадров.

export type Frame = { x: number; y: number; w: number; h: number }

export type Atlas = { image: HTMLImageElement; frames: Record<string, Frame> }

const BASE = '/assets/'

export async function loadAtlas(): Promise<Atlas> {
  const response = await fetch(`${BASE}atlas.json`)
  if (!response.ok) throw new Error(`atlas.json: ${response.status}`)
  const manifest = (await response.json()) as { image: string; frames: Record<string, Frame> }

  const image = new Image()
  image.src = BASE + manifest.image
  await image.decode()
  return { image, frames: manifest.frames }
}
