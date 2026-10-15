import { ServerStatus } from '../features/server/ServerStatus'
import { Panel } from '../ui/Panel'
import styles from './App.module.css'

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Там, где растёт</h1>
        <ServerStatus />
      </header>

      <main className={styles.main}>
        {/* Сюда встанет canvas-сад (задача 7). Пока — пустая земля в масштабе будущей сетки. */}
        <div className={styles.garden} aria-label="Сад">
          <p className={styles.gardenNote}>Сад ещё зарос. Скоро здесь появятся грядки.</p>
        </div>

        <aside className={styles.sidebar}>
          <Panel title="Привычки">
            <p className={styles.empty}>Здесь будут дела, за которые сад скажет спасибо.</p>
          </Panel>
          <Panel title="Сумка">
            <p className={styles.empty}>Пока пусто. Даже крошек нет.</p>
          </Panel>
        </aside>
      </main>

      <footer className={styles.footer}>Локальный режим разработки: без входа, данные хранятся на этом компьютере.</footer>
    </div>
  )
}
