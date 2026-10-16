// Пиксельные иконки 16×16 для кнопок панели: свиток-трекер, лавка, сумка.
// Цвета — из палитры токенов; при замене на спрайты разметка кнопок не меняется.

import type { ReactNode } from 'react'

const svg = (children: ReactNode) => (
  <svg width="32" height="32" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
    {children}
  </svg>
)

/** Свиток с отметками — трекер привычек. */
export const TrackerIcon = () =>
  svg(
    <>
      <rect x="2" y="1" width="12" height="14" fill="var(--c-ink)" />
      <rect x="3" y="2" width="10" height="12" fill="var(--c-parchment)" />
      <rect x="3" y="2" width="10" height="1" fill="var(--c-wood)" />
      <rect x="3" y="13" width="10" height="1" fill="var(--c-wood)" />
      {[4, 7, 10].map((y, i) => (
        <g key={y}>
          <rect x="4" y={y} width="2" height="2" fill={i < 2 ? 'var(--week-3)' : 'var(--c-parchment-shade)'} />
          <rect x="7" y={y + 1} width="5" height="1" fill="var(--c-bark)" />
        </g>
      ))}
    </>,
  )

/** Прилавок с навесом — лавка семян. */
export const ShopIcon = () =>
  svg(
    <>
      <rect x="1" y="2" width="14" height="5" fill="var(--c-ink)" />
      {[2, 4, 6, 8, 10, 12].map((x, i) => (
        <rect key={x} x={x} y="3" width="2" height="3" fill={i % 2 ? 'var(--c-parchment)' : 'var(--c-berry)'} />
      ))}
      <rect x="2" y="7" width="1" height="7" fill="var(--c-bark)" />
      <rect x="13" y="7" width="1" height="7" fill="var(--c-bark)" />
      <rect x="1" y="10" width="14" height="4" fill="var(--c-ink)" />
      <rect x="2" y="11" width="12" height="2" fill="var(--c-wood)" />
      <rect x="5" y="8" width="2" height="2" fill="var(--w-alive-grass)" />
      <rect x="9" y="8" width="2" height="2" fill="var(--c-sun)" />
    </>,
  )

/** Холщовая сумка — инвентарь. */
export const BagIcon = () =>
  svg(
    <>
      <rect x="5" y="1" width="6" height="1" fill="var(--c-ink)" />
      <rect x="4" y="2" width="1" height="3" fill="var(--c-ink)" />
      <rect x="11" y="2" width="1" height="3" fill="var(--c-ink)" />
      <rect x="2" y="5" width="12" height="10" fill="var(--c-ink)" />
      <rect x="3" y="6" width="10" height="8" fill="var(--c-wood)" />
      <rect x="3" y="6" width="10" height="1" fill="var(--c-parchment-shade)" />
      <rect x="11" y="7" width="2" height="7" fill="var(--c-bark)" />
      <rect x="6" y="9" width="4" height="2" fill="var(--c-bark)" />
      <rect x="7" y="9" width="2" height="1" fill="var(--c-sun)" />
    </>,
  )

/** Раскрытая книга с камнем — коллекция артефактов. */
export const CollectionIcon = () =>
  svg(
    <>
      <rect x="1" y="3" width="14" height="11" fill="var(--c-ink)" />
      <rect x="2" y="4" width="5" height="9" fill="var(--c-parchment)" />
      <rect x="9" y="4" width="5" height="9" fill="var(--c-parchment)" />
      <rect x="7" y="4" width="2" height="10" fill="var(--c-bark)" />
      <rect x="3" y="6" width="3" height="1" fill="var(--c-parchment-shade)" />
      <rect x="3" y="8" width="3" height="1" fill="var(--c-parchment-shade)" />
      <rect x="3" y="10" width="2" height="1" fill="var(--c-parchment-shade)" />
      <rect x="10" y="6" width="3" height="1" fill="var(--c-ink)" />
      <rect x="10" y="7" width="3" height="2" fill="var(--week-3)" />
      <rect x="11" y="9" width="1" height="1" fill="var(--week-3)" />
      <rect x="10" y="7" width="1" height="1" fill="var(--c-parchment)" />
    </>,
  )

/** Шестерёнка — настройки. */
export const SettingsIcon = () =>
  svg(
    <>
      {[
        [7, 1, 2, 3],
        [7, 12, 2, 3],
        [1, 7, 3, 2],
        [12, 7, 3, 2],
        [3, 3, 2, 2],
        [11, 3, 2, 2],
        [3, 11, 2, 2],
        [11, 11, 2, 2],
      ].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill="var(--c-ink)" />
      ))}
      <rect x="4" y="4" width="8" height="8" fill="var(--c-ink)" />
      <rect x="5" y="5" width="6" height="6" fill="var(--c-wood)" />
      <rect x="5" y="5" width="6" height="1" fill="var(--c-parchment)" />
      <rect x="7" y="7" width="2" height="2" fill="var(--c-ink)" />
    </>,
  )
