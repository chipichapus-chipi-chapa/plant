-- Сарай изнутри, загадка с ящиком, починка тачки и прополка грядок.

-- Инструменты — новый вид предметов: не тратятся при использовании (кроме ремонтного набора в рецепте)
ALTER TABLE item_def DROP CONSTRAINT item_def_kind_check;
ALTER TABLE item_def ADD CONSTRAINT item_def_kind_check
    CHECK (kind IN ('CURRENCY', 'SHARD', 'SEED', 'DECOR', 'TOOL'));

-- Надпись на кнопке рецепта: «Пробудить» подходит чаше, а тачку — «Починить»
ALTER TABLE recipe_def ADD COLUMN action_label VARCHAR(30) NOT NULL DEFAULT 'Пробудить';

-- Клетки сада, изменённые игроком. Пока это прополотые заросшие грядки: такая клетка становится обычной грядкой.
-- Ключ (игрок, карта, клетка) не даёт прополоть одну клетку дважды.
CREATE TABLE player_tile (
    player_id   BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    garden_key  VARCHAR(40)  NOT NULL,
    x           SMALLINT     NOT NULL CHECK (x >= 0),
    y           SMALLINT     NOT NULL CHECK (y >= 0),
    state       VARCHAR(16)  NOT NULL CHECK (state IN ('WEEDED')),
    changed_at  TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (player_id, garden_key, x, y)
);

-- Загадки (контент, строки — в R__content.sql) ---------------------------------
-- Замок из нескольких колёсиков с символами. Ответ хранится только на сервере:
-- в каталог уходят символы и число колёсиков, но не правильная комбинация.
CREATE TABLE puzzle_def (
    key          VARCHAR(40)   PRIMARY KEY,
    -- ключ постройки из content/gardens/*.json; согласованность проверяется при старте
    prop_key     VARCHAR(40)   NOT NULL UNIQUE,
    prompt       VARCHAR(300)  NOT NULL,
    -- правильные символы по порядку, через запятую
    answer       VARCHAR(200)  NOT NULL,
    solved_text  VARCHAR(400)  NOT NULL,
    wrong_text   VARCHAR(300)  NOT NULL
);

CREATE TABLE puzzle_symbol (
    puzzle_key  VARCHAR(40)  NOT NULL REFERENCES puzzle_def (key) ON DELETE CASCADE,
    symbol_key  VARCHAR(20)  NOT NULL,
    name        VARCHAR(40)  NOT NULL,
    sort_order  SMALLINT     NOT NULL,
    PRIMARY KEY (puzzle_key, symbol_key)
);

CREATE TABLE puzzle_reward (
    puzzle_key  VARCHAR(40)  NOT NULL REFERENCES puzzle_def (key) ON DELETE CASCADE,
    item_key    VARCHAR(40)  NOT NULL REFERENCES item_def (key),
    quantity    INTEGER      NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (puzzle_key, item_key)
);

-- Разгаданные загадки: награда — один раз, неверные попытки ничего не стоят и не хранятся
CREATE TABLE player_puzzle (
    player_id   BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    puzzle_key  VARCHAR(40)  NOT NULL REFERENCES puzzle_def (key),
    solved_at   TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (player_id, puzzle_key)
);
