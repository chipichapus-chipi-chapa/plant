import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Текст «по буквам» без перерисовки React на каждую букву: буквы дописываются прямо в DOM
 * по кадрам анимации (сколько успело пройти времени — столько букв), а React узнаёт лишь, что реплика
 * дописана. На медленном телефоне печать не отстаёт и не тормозит игру.
 *
 * shownRef — видимая часть, ghostRef — ещё не напечатанная (прозрачная, держит размер окна).
 */
export function useTypewriter(text: string, delay: number, instant: boolean) {
  const shownRef = useRef<HTMLSpanElement>(null)
  const ghostRef = useRef<HTMLSpanElement>(null)
  // какая реплика уже дописана: при смене текста счёт начинается заново без отдельного сброса
  const [doneText, setDoneText] = useState<string | null>(null)
  const complete = instant || delay === 0 || doneText === text
  const skip = useRef(false)

  const paint = useCallback(
    (count: number) => {
      if (shownRef.current) shownRef.current.textContent = text.slice(0, count)
      if (ghostRef.current) ghostRef.current.textContent = text.slice(count)
    },
    [text],
  )

  useEffect(() => {
    if (complete) {
      paint(text.length)
      return
    }
    skip.current = false
    paint(0)
    const start = performance.now()
    let frame = 0
    let shown = 0
    const tick = (now: number) => {
      const count = skip.current ? text.length : Math.min(text.length, Math.floor((now - start) / delay))
      if (count !== shown) {
        shown = count
        paint(count)
      }
      if (count >= text.length) setDoneText(text)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, delay, complete, paint])

  /** Показать реплику целиком (клик посреди печати). */
  const finish = useCallback(() => {
    skip.current = true
    paint(text.length)
    setDoneText(text)
  }, [text, paint])

  return { shownRef, ghostRef, complete, finish }
}
