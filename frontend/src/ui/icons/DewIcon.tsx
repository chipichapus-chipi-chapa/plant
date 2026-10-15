/** Росинка — игровая валюта. Пиксельная иконка 8×8, заменяется спрайтом без изменения разметки. */
export function DewIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="0" width="2" height="1" fill="var(--c-ink)" />
      <rect x="2" y="1" width="1" height="2" fill="var(--c-ink)" />
      <rect x="5" y="1" width="1" height="2" fill="var(--c-ink)" />
      <rect x="1" y="3" width="1" height="3" fill="var(--c-ink)" />
      <rect x="6" y="3" width="1" height="3" fill="var(--c-ink)" />
      <rect x="2" y="6" width="4" height="1" fill="var(--c-ink)" />
      <rect x="3" y="1" width="2" height="5" fill="var(--c-dew)" />
      <rect x="2" y="3" width="4" height="3" fill="var(--c-dew)" />
      <rect x="3" y="3" width="1" height="1" fill="var(--c-parchment)" />
    </svg>
  )
}
