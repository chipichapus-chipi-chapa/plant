/** Семя жизни — основная валюта. Пиксельная иконка 8×8: светящееся семечко с ростком. */
export function LifeSeedIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="4" y="0" width="2" height="1" fill="var(--w-alive-grass)" />
      <rect x="4" y="1" width="1" height="2" fill="var(--w-alive-leaf)" />
      <rect x="2" y="3" width="4" height="1" fill="var(--c-ink)" />
      <rect x="1" y="4" width="1" height="2" fill="var(--c-ink)" />
      <rect x="6" y="4" width="1" height="2" fill="var(--c-ink)" />
      <rect x="2" y="6" width="4" height="1" fill="var(--c-ink)" />
      <rect x="2" y="4" width="4" height="2" fill="var(--c-sun)" />
      <rect x="2" y="4" width="1" height="1" fill="var(--c-parchment)" />
      <rect x="5" y="5" width="1" height="1" fill="var(--c-wood)" />
    </svg>
  )
}
