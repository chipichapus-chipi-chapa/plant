/** Подарки жителям. Принимает и считает сервер — здесь только кто есть кто и обычная благодарность. */
import type { Dialogue } from '../api/types'

/** Один человек под разными ключами на разных картах: agata и agata-home — оба agata (как на сервере). */
export const person = (npcKey: string) => npcKey.split('-')[0]

/** Благодарность за подарок, который житель не назвал бы любимым: неправильных подарков нет. */
export function thanksDialogue(itemName: string | undefined): Dialogue {
  const what = itemName ? `«${itemName}»` : 'Подарок'
  return {
    start: 'a',
    onEnd: null,
    gift: null,
    nodes: { a: { text: `${what} — мне? Спасибо! Приятно, когда о тебе помнят.`, next: null, choices: null } },
  }
}
