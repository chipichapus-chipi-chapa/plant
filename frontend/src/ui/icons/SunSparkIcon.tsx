/** Солнечная искра 8×8: тёплое солнышко с лучами. */
export function SunSparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="0" width="2" height="1" fill="var(--c-sun)" />
      <rect x="3" y="7" width="2" height="1" fill="var(--c-sun)" />
      <rect x="0" y="3" width="1" height="2" fill="var(--c-sun)" />
      <rect x="7" y="3" width="1" height="2" fill="var(--c-sun)" />
      <rect x="2" y="2" width="4" height="4" fill="var(--c-ink)" />
      <rect x="3" y="2" width="2" height="4" fill="var(--c-sun)" />
      <rect x="2" y="3" width="4" height="2" fill="var(--c-sun)" />
      <rect x="3" y="3" width="1" height="1" fill="var(--c-parchment)" />
    </svg>
  )
}
