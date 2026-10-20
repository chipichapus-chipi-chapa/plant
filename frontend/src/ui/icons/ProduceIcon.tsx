/** Урожай 8×8: цветок на стебле с листиком — для овощей и цветов со своих грядок. */
export function ProduceIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="0" width="4" height="4" fill="var(--c-ink)" />
      <rect x="3" y="1" width="2" height="2" fill="var(--w-alive-flower, #e7a3b8)" />
      <rect x="3" y="4" width="1" height="4" fill="var(--w-alive-leaf)" />
      <rect x="4" y="5" width="2" height="1" fill="var(--w-alive-leaf)" />
    </svg>
  )
}
