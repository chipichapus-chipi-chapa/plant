-- Игрок -----------------------------------------------------------------------

-- Учётная запись. В локальном режиме одна строка с username = 'local';
-- при появлении настоящего входа сюда добавятся email и password_hash.
CREATE TABLE app_user (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Игровой профиль: один на пользователя, поэтому его ключ — user_id.
-- Остальные таблицы ссылаются на него как на player_id.
CREATE TABLE player_profile (
    user_id       BIGINT       PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
    display_name  VARCHAR(40)  NOT NULL CHECK (length(trim(display_name)) > 0),
    -- IANA-зона (Europe/Moscow): по ней сервер решает, какой у игрока «сегодня»
    timezone      VARCHAR(64)  NOT NULL,
    -- росинки; отрицательный баланс невозможен на уровне базы
    coins         INTEGER      NOT NULL DEFAULT 0 CHECK (coins >= 0),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Контент (общий для всех игроков, заполняется в R__content.sql) ---------------

CREATE TABLE plant_species (
    key            VARCHAR(40)  PRIMARY KEY,
    name           VARCHAR(60)  NOT NULL,
    -- длительность каждой стадии роста в минутах; после последней растение взрослое.
    -- [10, 30] значит: росток 10 мин → молодое 30 мин → взрослое навсегда
    stage_minutes  INTEGER[]    NOT NULL CHECK (cardinality(stage_minutes) >= 1)
);

CREATE TABLE item_def (
    key          VARCHAR(40)   PRIMARY KEY,
    kind         VARCHAR(16)   NOT NULL CHECK (kind IN ('SEED', 'DECOR')),
    name         VARCHAR(60)   NOT NULL,
    description  VARCHAR(200)  NOT NULL,
    -- цена в росинках; NULL — предмет не продаётся (только находка или награда)
    price        INTEGER       CHECK (price > 0),
    species_key  VARCHAR(40)   REFERENCES plant_species (key),
    -- семя обязано знать, что из него вырастет
    CHECK (kind <> 'SEED' OR species_key IS NOT NULL)
);

-- Инвентарь -------------------------------------------------------------------

CREATE TABLE inventory_item (
    player_id  BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    item_key   VARCHAR(40)  NOT NULL REFERENCES item_def (key),
    quantity   INTEGER      NOT NULL CHECK (quantity >= 0),
    PRIMARY KEY (player_id, item_key)
);
