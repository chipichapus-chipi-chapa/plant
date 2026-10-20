import styles from './ControlsHelp.module.css'

const touch = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

type Row = { keys: string[]; text: string }

const KEYBOARD: Row[] = [
  { keys: ['W', 'A', 'S', 'D'], text: 'или стрелки — идти' },
  { keys: ['E', 'Пробел'], text: 'действие с тем, что перед вами: поговорить, войти в дверь, осмотреть, посадить' },
  { keys: ['Клик'], text: 'по предмету с «!» или по жителю — то же самое, что действие' },
  { keys: ['Esc'], text: 'закрыть окно или разговор' },
]

const TOUCH: Row[] = [
  { keys: ['Палец'], text: 'ведите по саду — герой идёт туда, куда тянете' },
  { keys: ['✋'], text: 'кнопка в углу — действие: поговорить, войти в дверь, осмотреть' },
  { keys: ['Касание'], text: 'по предмету с «!» или по жителю — то же самое' },
]

/**
 * Памятка «Как играть»: показывается один раз при первом входе и открывается снова из настроек.
 * Чтобы не перебирать клавиши наугад.
 */
export function ControlsHelp() {
  const rows = touch() ? TOUCH : KEYBOARD
  return (
    <div className={styles.help}>
      <ul className={styles.rows}>
        {rows.map((row) => (
          <li key={row.text} className={styles.row}>
            <span className={styles.keys}>
              {row.keys.map((k) => (
                <kbd key={k} className={styles.key}>
                  {k}
                </kbd>
              ))}
            </span>
            <span>{row.text}</span>
          </li>
        ))}
      </ul>
      <div className={styles.signs}>
        <p>
          <strong className={styles.bang}>!</strong> над предметом — с ним можно что-то сделать, подойдите вплотную.
        </p>
        <p>
          <strong className={styles.bubble}>!</strong> в облачке над жителем — ему есть что сказать.
        </p>
        <p>
          Кнопки внизу: <b>Задания</b>, <b>Привычки</b> (отмечайте дела — получайте Семена жизни), <b>Лавка</b>, <b>Сумка</b>,
          <b> Коллекция</b> и <b>Настройки</b>. Эту памятку можно открыть снова в настройках.
        </p>
      </div>
    </div>
  )
}
