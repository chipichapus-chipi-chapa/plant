import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { finishDialogue } from '../../api/game'
import type { Catalog } from '../../api/types'
import { frameImage, type Atlas } from '../../game/atlas'
import { describeReward } from '../../lib/rewards'
import { useToast } from '../notifications/Toasts'
import styles from './DialogueBox.module.css'

type Props = {
  dialogueKey: string
  catalog: Catalog
  atlas: Atlas
  onClose: () => void
  onChanged: () => Promise<void>
}

const SPEED_MS = 22
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Разговор с наставником внизу экрана: портрет, имя, текст по буквам.
 * Клик или Enter/Пробел — показать реплику целиком, затем дальше. В конце сервер ставит флаг
 * разговора и (один раз) выдаёт подарок.
 */
export function DialogueBox({ dialogueKey, catalog, atlas, onClose, onChanged }: Props) {
  const dialogue = catalog.mentor.dialogues[dialogueKey]
  const [nodeId, setNodeId] = useState(dialogue.start)
  // сколько букв текущей реплики уже напечатано; при смене реплики счёт начинается заново
  const [typed, setTyped] = useState({ node: dialogue.start, count: 0 })
  const [finishing, setFinishing] = useState(false)
  const portraitRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const node = dialogue.nodes[nodeId]
  const instant = reducedMotion()
  const shown = instant ? node.text.length : typed.node === nodeId ? typed.count : 0
  const complete = shown >= node.text.length

  useEffect(() => {
    const ctx = portraitRef.current?.getContext('2d')
    const image = frameImage(atlas, 'npc_vereshk')
    if (!ctx || !image) return
    ctx.clearRect(0, 0, 32, 32)
    // портрет — верхняя часть спрайта: голова и плечи
    ctx.drawImage(image, 0, 6, 32, 32, 0, 0, 32, 32)
  }, [atlas])

  // Текст печатается по буквам; при «уменьшить движение» появляется сразу
  useEffect(() => {
    if (instant || complete) return
    const timer = window.setInterval(() => {
      setTyped((t) => (t.node === nodeId ? { node: nodeId, count: t.count + 1 } : { node: nodeId, count: 1 }))
    }, SPEED_MS)
    return () => window.clearInterval(timer)
  }, [nodeId, instant, complete])

  useEffect(() => boxRef.current?.focus(), [])

  const finish = async () => {
    setFinishing(true)
    try {
      const result = await finishDialogue(dialogueKey)
      if (result.gift.length > 0) {
        toast({ message: `${catalog.mentor.speaker.name} протягивает подарок.`, reward: describeReward(result.gift, catalog) })
      }
      await onChanged()
    } catch (e) {
      // Разговор не к месту (например, открыт в двух вкладках) — просто закрываем, ничего не потеряно
      if (!(e instanceof ApiError && e.status === 409)) {
        toast({ message: 'Вереск задумался и потерял мысль. Попробуйте поговорить ещё раз.' })
      }
    } finally {
      onClose()
    }
  }

  const advance = () => {
    if (finishing) return
    if (!complete) {
      setTyped({ node: nodeId, count: node.text.length })
      return
    }
    if (node.choices) return // ждём выбора ответа
    if (node.next) setNodeId(node.next)
    else void finish()
  }

  return (
    <div className={styles.layer}>
      <div
        ref={boxRef}
        className={styles.box}
        role="dialog"
        aria-label={`Разговор: ${catalog.mentor.speaker.name}`}
        tabIndex={-1}
        onClick={advance}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            advance()
          }
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className={styles.portrait}>
          <canvas ref={portraitRef} width={32} height={32} className={styles.face} aria-hidden="true" />
        </div>
        <div className={styles.speech}>
          <span className={styles.name}>{catalog.mentor.speaker.name}</span>
          <p className={styles.text} aria-live="polite">
            {node.text.slice(0, shown)}
            <span className={styles.ghost} aria-hidden="true">
              {node.text.slice(shown)}
            </span>
          </p>
          {complete && node.choices ? (
            <div className={styles.choices}>
              {node.choices.map((choice) => (
                <button
                  key={choice.text}
                  type="button"
                  className={styles.choice}
                  onClick={(e) => {
                    e.stopPropagation()
                    setNodeId(choice.next)
                  }}
                >
                  ▸ {choice.text}
                </button>
              ))}
            </div>
          ) : (
            <span className={styles.more} aria-hidden="true">
              {complete ? (node.next ? 'Далее ▸' : 'Закончить ▸') : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
