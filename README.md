# Там, где растёт

Уютная браузерная игра с пиксельной графикой: заброшенный сад оживает вместе с реальными привычками игрока.
Отмечаешь привычку — получаешь Семена жизни и осколок кристалла её категории, тратишь их на сад и магию.
Пропуски ничем не наказываются.

> **Статус:** работают привычки с категориями кристаллов и награды. Сад, магазин и магия появляются
> по плану из [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Концепция кристаллов — [docs/design/crystals.md](docs/design/crystals.md).

## Стек

| Часть | Технологии |
|---|---|
| Frontend | React 19, TypeScript, Vite, CSS Modules, свой рендер сада на Canvas 2D |
| Backend | Java 17, Spring Boot 4, Spring Data JPA, Bean Validation, REST |
| База | PostgreSQL 16, миграции Flyway |
| Тесты | JUnit 5 + Testcontainers (настоящий PostgreSQL), Vitest |

## Что нужно установить

- **JDK 17+** (именно JDK с `javac`, а не JRE)
- **Node.js 22** (версия записана в `.nvmrc`; с nvm: `nvm use`)
- **Docker** с Docker Compose v2 — для базы и для backend-тестов

## Запуск локально

1. Создать `.env` из примера и вписать любой пароль для локальной базы:

   ```bash
   cp .env.example .env
   ```

2. Поднять PostgreSQL (порт на хосте — 5434):

   ```bash
   docker compose up -d
   ```

3. Запустить backend на http://127.0.0.1:8081 (пароль БД он читает из того же `.env`):

   ```bash
   cd backend && ./mvnw spring-boot:run
   ```

4. В другом терминале запустить frontend на http://localhost:5173:

   ```bash
   cd frontend && npm install && npm run dev
   ```

Если `java -version` показывает не 17+, укажите JDK явно, например
`JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./mvnw spring-boot:run`.

## Проверки

```bash
cd backend && ./mvnw verify
```

```bash
cd frontend && npm run lint && npm test && npm run build
```

Backend-тесты сами поднимают одноразовый PostgreSQL в Docker, поэтому база из `docker compose` им не нужна.

## Локальный режим и его ограничения

Сейчас в игре **нет авторизации**, и это осознанный режим разработки, а не «вход понарошку»:

- backend слушает только `127.0.0.1`, поэтому из сети он недоступен;
- в игре один игрок, все данные лежат в локальной базе;
- **этот режим нельзя разворачивать на публичном сервере.** Перед любым деплоем добавляется настоящая аутентификация (см. план).

## Заметки по окружению

- `backend/.mvn/settings.xml` изолирует сборку от глобального `~/.m2/settings.xml` (например, корпоративных зеркал) и берёт зависимости из Maven Central.
- Порты 5434, 8081 и 5173 выбраны, чтобы не конфликтовать с другими сервисами на машине разработки. Порт базы задаётся в `.env`.

## Структура

```
backend/    Spring Boot API
frontend/   React-клиент и canvas-рендер сада
docs/       архитектура и принятые решения
```
