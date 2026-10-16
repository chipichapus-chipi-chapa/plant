# Запуск в Telegram

Игра — Telegram Mini App: у бота кнопка «Играть», она открывает сайт с игрой прямо в Telegram.
Ничего не работает с компьютера разработчика:

| Часть | Где живёт | Как обновляется |
|---|---|---|
| Фронтенд (сайт) | GitHub Pages — `https://chipichapus-chipi-chapa.github.io/plant/` | `.github/workflows/pages.yml` при пуше в `main` |
| Сервер (Spring Boot) | Render, бесплатный тариф, образ из `backend/Dockerfile` | `render.yaml`, автодеплой при пуше в `main` |
| База (PostgreSQL) | Neon, бесплатный тариф | Flyway накатывает миграции при старте сервера |
| Бот | Telegram, настраивается в @BotFather | кода у бота нет |

## Как устроен вход

Telegram передаёт Mini App строку `initData`, подписанную токеном бота. Фронтенд кладёт её
в заголовок `X-Telegram-Init-Data` каждого запроса, сервер проверяет подпись (HMAC-SHA256,
`TelegramInitData`) и находит или создаёт игрока `tg:<id>`. Подделать строку без токена нельзя,
поэтому пароли и сессии не нужны. Токен бота живёт только в переменных окружения Render.

Режим включается переменной `TELEGRAM_BOT_TOKEN`. Без неё сервер работает по-старому —
один локальный игрок — и отказывается стартовать, если его пытаются открыть в сеть.

## Первая настройка (один раз)

1. **База — Neon.** Войдите на neon.tech через GitHub → New project (регион Frankfurt) →
   Connection string, вариант без `-pooler`. Из `postgresql://USER:PASSWORD@HOST/DB?sslmode=require`
   понадобятся три значения:
   - `SPRING_DATASOURCE_URL` = `jdbc:postgresql://HOST/DB?sslmode=require`
   - `SPRING_DATASOURCE_USERNAME` = `USER`
   - `SPRING_DATASOURCE_PASSWORD` = `PASSWORD`
2. **Сервер — Render.** Войдите на render.com через GitHub → New → Blueprint → репозиторий `plant`.
   Render прочитает `render.yaml` и попросит секреты: три значения из Neon и `TELEGRAM_BOT_TOKEN`
   (выдал @BotFather). Первая сборка идёт ~5 минут. Адрес сервера будет вида
   `https://where-it-grows.onrender.com`; проверка — `/actuator/health` отвечает `UP`.
3. **Сайт — GitHub Pages.** В репозитории Settings → Pages → Source: **GitHub Actions**.
   Settings → Secrets and variables → Actions → Variables → New variable:
   `API_URL` = адрес сервера из шага 2 (без `/` в конце). Затем Actions → Pages → Run workflow.
4. **Бот.** В @BotFather: `/mybots` → бот → Bot Settings → Menu Button →
   адрес `https://chipichapus-chipi-chapa.github.io/plant/` и подпись «Играть».
   По желанию `/newapp` даст ещё и прямую ссылку вида `t.me/<бот>/<имя>`.

Дальше всё обновляется само: пуш в `main` пересобирает и сайт, и сервер.

## Что нужно знать

- Бесплатный сервер Render засыпает после 15 минут без запросов. Первый вход после паузы
  ждёт около минуты — игра покажет «Сервер сада не отвечает», кнопка «Попробовать ещё раз» поможет.
- Если токен бота попал куда не следует — `/revoke` в @BotFather и новый токен в Render
  (Environment → `TELEGRAM_BOT_TOKEN`). Прогресс игроков не пострадает: он привязан к их Telegram id.
- Открыть сайт в обычном браузере можно, но сервер ответит «Нужен вход через Telegram».
  Для разработки по-прежнему: локальный backend без токена и `npm run dev`.
