-- Магические рецепты (контент, строки — в R__content.sql) ------------------------
-- Рецепт пробуждает объект мира (постройку с карты сада) за набор ресурсов.
CREATE TABLE recipe_def (
    key                VARCHAR(40)   PRIMARY KEY,
    name               VARCHAR(80)   NOT NULL,
    description        VARCHAR(300)  NOT NULL,
    -- ключ постройки из content/gardens/*.json; согласованность проверяется при старте
    target_object_key  VARCHAR(40)   NOT NULL UNIQUE,
    -- что увидит игрок после пробуждения
    result_text        VARCHAR(300)  NOT NULL,
    sort_order         SMALLINT      NOT NULL
);

CREATE TABLE recipe_ingredient (
    recipe_key  VARCHAR(40)  NOT NULL REFERENCES recipe_def (key) ON DELETE CASCADE,
    item_key    VARCHAR(40)  NOT NULL REFERENCES item_def (key),
    quantity    INTEGER      NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (recipe_key, item_key)
);

-- Состояние объектов мира у игрока ---------------------------------------------
-- Нет строки — объект спит. Ключ (игрок, объект) не даёт пробудить его дважды.
CREATE TABLE player_world_object (
    player_id   BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    object_key  VARCHAR(40)  NOT NULL,
    state       VARCHAR(16)  NOT NULL CHECK (state IN ('AWAKENED')),
    changed_at  TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (player_id, object_key)
);
