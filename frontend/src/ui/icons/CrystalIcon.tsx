/**
 * Кристалл 8×8: гранёный камень с бликом. Цвет приходит из каталога, поэтому новые
 * категории не требуют новых иконок. muted — для силуэтов и неактивных состояний.
 */
export function CrystalIcon({ color, size = 16, muted = false }: { color: string; size?: number; muted?: boolean }) {
  const body = muted ? 'var(--c-parchment-shade)' : color
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      {/* контур: плоская «корона» сверху, остриё снизу */}
      <rect x="2" y="1" width="4" height="1" fill="var(--c-ink)" />
      <rect x="1" y="2" width="1" height="1" fill="var(--c-ink)" />
      <rect x="6" y="2" width="1" height="1" fill="var(--c-ink)" />
      <rect x="0" y="3" width="1" height="1" fill="var(--c-ink)" />
      <rect x="7" y="3" width="1" height="1" fill="var(--c-ink)" />
      <rect x="1" y="4" width="1" height="1" fill="var(--c-ink)" />
      <rect x="6" y="4" width="1" height="1" fill="var(--c-ink)" />
      <rect x="2" y="5" width="1" height="1" fill="var(--c-ink)" />
      <rect x="5" y="5" width="1" height="1" fill="var(--c-ink)" />
      <rect x="3" y="6" width="2" height="1" fill="var(--c-ink)" />
      {/* тело камня */}
      <rect x="2" y="2" width="4" height="1" fill={body} />
      <rect x="1" y="3" width="6" height="1" fill={body} />
      <rect x="2" y="4" width="4" height="1" fill={body} />
      <rect x="3" y="5" width="2" height="1" fill={body} />
      {/* грань в тени и блик */}
      <rect x="4" y="3" width="3" height="1" fill="var(--c-ink)" opacity="0.2" />
      <rect x="4" y="4" width="2" height="1" fill="var(--c-ink)" opacity="0.3" />
      <rect x="4" y="5" width="1" height="1" fill="var(--c-ink)" opacity="0.3" />
      {!muted && <rect x="2" y="2" width="2" height="1" fill="var(--c-parchment)" opacity="0.8" />}
    </svg>
  )
}
