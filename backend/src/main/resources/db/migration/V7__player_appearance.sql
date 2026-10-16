-- Внешность персонажа: слоты (причёска, цвет волос, …) и варианты — контент ---------
-- Новый вариант или даже новый слот добавляется строками в R__content.sql, без миграции.
CREATE TABLE appearance_slot (
    key         VARCHAR(40)  PRIMARY KEY,
    name        VARCHAR(60)  NOT NULL,
    -- STYLE — форма (спрайт-слой), COLOR — цвет для перекраски слоя
    kind        VARCHAR(8)   NOT NULL CHECK (kind IN ('STYLE', 'COLOR')),
    sort_order  SMALLINT     NOT NULL
);

CREATE TABLE appearance_option (
    slot_key    VARCHAR(40)  NOT NULL REFERENCES appearance_slot (key) ON DELETE CASCADE,
    key         VARCHAR(40)  NOT NULL,
    name        VARCHAR(60)  NOT NULL,
    color       VARCHAR(7)   CHECK (color ~ '^#[0-9a-f]{6}$'),
    sort_order  SMALLINT     NOT NULL,
    PRIMARY KEY (slot_key, key)
);

-- Выбор игрока: по одному варианту на слот; несуществующий вариант не сохранить
CREATE TABLE player_appearance (
    player_id   BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    slot_key    VARCHAR(40)  NOT NULL,
    option_key  VARCHAR(40)  NOT NULL,
    PRIMARY KEY (player_id, slot_key),
    FOREIGN KEY (slot_key, option_key) REFERENCES appearance_option (slot_key, key)
);

-- Персонаж создан (игрок прошёл окно «Новый садовник»)
ALTER TABLE player_profile ADD COLUMN onboarded_at TIMESTAMPTZ;
