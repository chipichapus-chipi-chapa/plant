import type { CapacitorConfig } from '@capacitor/cli'

// Android-приложение (APK): та же игра, что на сайте, файлы игры лежат внутри APK.
// За прогрессом приложение ходит на тот же сервер; вход — по ключу устройства.
const config: CapacitorConfig = {
  appId: 'app.wheregrows.garden',
  appName: 'Там, где растёт',
  webDir: 'dist',
  android: {
    backgroundColor: '#120e0d',
  },
}

export default config
