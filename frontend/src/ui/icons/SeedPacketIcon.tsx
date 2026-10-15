/** Бумажный пакетик семян 8×8 с цветным ярлыком растения. */
export function SeedPacketIcon({ size = 16, accent = 'var(--w-alive-leaf)' }: { size?: number; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="0" width="6" height="8" fill="var(--c-ink)" />
      <rect x="2" y="1" width="4" height="6" fill="var(--c-parchment-shade)" />
      <rect x="2" y="1" width="4" height="1" fill="var(--c-wood)" />
      <rect x="3" y="3" width="2" height="3" fill={accent} />
      <rect x="3" y="3" width="1" height="1" fill="var(--c-parchment)" />
    </svg>
  )
}
