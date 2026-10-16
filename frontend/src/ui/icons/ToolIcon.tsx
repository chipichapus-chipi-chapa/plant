/** Инструмент 8×8: деревянная ручка и железное полотно, как у лопаты. */
export function ToolIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="5" y="0" width="2" height="2" fill="var(--c-ink)" />
      <rect x="4" y="1" width="2" height="2" fill="var(--c-ink)" />
      <rect x="3" y="2" width="2" height="2" fill="var(--c-ink)" />
      <rect x="5" y="0" width="1" height="1" fill="var(--c-wood)" />
      <rect x="4" y="1" width="1" height="1" fill="var(--c-wood)" />
      <rect x="0" y="4" width="5" height="4" fill="var(--c-ink)" />
      <rect x="1" y="4" width="3" height="3" fill="#8f9aa0" />
      <rect x="1" y="4" width="1" height="1" fill="#d4dadc" />
    </svg>
  )
}
