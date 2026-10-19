-- Вход в приложении (PWA) без регистрации и привязка его к Telegram.

-- Ключ устройства: приложение получает его один раз и шлёт в каждом запросе.
-- В базе лежит только SHA-256 ключа: даже утечка базы не даст войти чужим садом.
CREATE TABLE device_token (
    token_hash  BYTEA        PRIMARY KEY CHECK (length(token_hash) = 32),
    user_id     BIGINT       NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX device_token_user ON device_token (user_id);

-- Код привязки: приложение открывает бота по ссылке t.me/<бот>?start=link_<code>,
-- бот видит, кто нажал «Старт», и связывает сад устройства с этим Telegram.
CREATE TABLE telegram_link_code (
    code        VARCHAR(32)  PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- когда привязано; пусто — ещё ждём «Старт» в боте
    linked_at   TIMESTAMPTZ
);
