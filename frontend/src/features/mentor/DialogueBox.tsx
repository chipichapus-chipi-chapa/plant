import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { finishDialogue } from '../../api/game'
import type { Catalog, Dialogue } from '../../api/types'
import { frameImage, type Atlas } from '../../game/atlas'
import { describeReward } from '../../lib/rewards'
import { useToast } from '../notifications/Toasts'
import styles from './DialogueBox.module.css'

/** Кто говорит: имя и кадр атласа, из которого вырезается портрет (32×32 с точки crop). */
export type Speaker = { name: string; frame: string; crop: [number, number] }

type Props = {
  speaker: Speaker
  dialogue: Dialogue
  atlas: Atlas
  /** Разговор дочитан (до последней реплики) */
  onEnd: () => Promise<void> | void
  /** Закрыть окно: после onEnd или по Escape */
  onClose: () => void
}

type MentorProps = {
  dialogueKey: string
  catalog: Catalog
  atlas: Atlas
  onClose: () => void
  onChanged: () => Promise<void>
}

/** Портрет Вереска — капюшон, лицо и борода из спрайта 32×48. */
const VERESHK_CROP: [number, number] = [0, 4]

/**
 * Разговор с Мастером Вереском: в конце сервер ставит флаг разговора и (один раз) выдаёт подарок.
 */
export function MentorDialogue({ dialogueKey, catalog, atlas, onClose, onChanged }: MentorProps) {
  const toast = useToast()
  const finish = async () => {
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
    }
  }
  return (
    <DialogueBox
      speaker={{ name: catalog.mentor.speaker.name, frame: 'npc_vereshk', crop: VERESHK_CROP }}
      dialogue={catalog.mentor.dialogues[dialogueKey]}
      atlas={atlas}
      onEnd={finish}
      onClose={onClose}
    />
  )
}

const SPEED_MS = 22
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Разговор внизу экрана: портрет, имя, текст по буквам. Один и тот же для Вереска и жителей тропы.
 * Клик или Enter/Пробел — показать реплику целиком, затем дальше; варианты ответа ведут по графу реплик.
 */
export function DialogueBox({ speaker, dialogue, atlas, onEnd, onClose }: Props) {
  const [nodeId, setNodeId] = useState(dialogue.start)
  // сколько букв текущей реплики уже напечатано; при смене реплики счёт начинается заново
  const [typed, setTyped] = useState({ node: dialogue.start, count: 0 })
  const [finishing, setFinishing] = useState(false)
  const portraitRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const node = dialogue.nodes[nodeId]
  const instant = reducedMotion()
  const shown = instant ? node.text.length : typed.node === nodeId ? typed.count : 0
  const complete = shown >= node.text.length

  useEffect(() => {
    const ctx = portraitRef.current?.getContext('2d')
    const image = frameImage(atlas, speaker.frame)
    if (!ctx || !image) return
    ctx.clearRect(0, 0, 32, 32)
    ctx.drawImage(image, speaker.crop[0], speaker.crop[1], 32, 32, 0, 0, 32, 32)
  }, [atlas, speaker.frame, speaker.crop])

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
      await onEnd()
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
        aria-label={`Разговор: ${speaker.name}`}
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
          <span className={styles.name}>{speaker.name}</span>
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
