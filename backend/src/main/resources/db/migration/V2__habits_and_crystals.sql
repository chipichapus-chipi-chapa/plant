-- Категории кристаллов (контент, строки — в R__content.sql) ---------------------

CREATE TABLE crystal_category (
    key          VARCHAR(40)   PRIMARY KEY,
    name         VARCHAR(60)   NOT NULL,
    -- цвет для интерфейса и спрайтов, #rrggbb
    color        VARCHAR(7)    NOT NULL CHECK (color ~ '^#[0-9a-f]{6}$'),
    meaning      VARCHAR(120)  NOT NULL,
    sort_order   SMALLINT      NOT NULL
);

-- Все исчисляемые ресурсы живут в одном инвентаре ------------------------------
-- CURRENCY — валюты (Семена жизни), SHARD — осколки кристаллов.

ALTER TABLE item_def DROP CONSTRAINT item_def_kind_check;
ALTER TABLE item_def ADD CONSTRAINT item_def_kind_check
    CHECK (kind IN ('CURRENCY', 'SHARD', 'SEED', 'DECOR'));
ALTER TABLE item_def ADD COLUMN crystal_category VARCHAR(40) REFERENCES crystal_category (key);
ALTER TABLE item_def ADD CONSTRAINT item_def_shard_has_category
    CHECK (kind <> 'SHARD' OR crystal_category IS NOT NULL);
-- на каждую категорию ровно один вид осколка
CREATE UNIQUE INDEX item_def_one_shard_per_category ON item_def (crystal_category) WHERE kind = 'SHARD';

-- Перенос баланса: колонка coins превращается в предмет life_seed.
-- Строка предмета нужна уже здесь (R__content.sql выполняется позже и лишь обновит её).
INSERT INTO item_def (key, kind, name, description)
VALUES ('life_seed', 'CURRENCY', 'Семена жизни', 'Награда за дела в настоящей жизни.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO inventory_item (player_id, item_key, quantity)
SELECT user_id, 'life_seed', coins FROM player_profile WHERE coins > 0;

ALTER TABLE player_profile DROP COLUMN coins;

-- Привычки -------------------------------------------------------------------

CREATE TABLE habit (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id         BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    title             VARCHAR(60)  NOT NULL CHECK (length(trim(title)) > 0),
    -- необязательная категория: какой осколок приносит выполнение
    crystal_category  VARCHAR(40)  REFERENCES crystal_category (key),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- привычки не удаляются, а убираются в архив: история отметок сохраняется
    archived_at       TIMESTAMPTZ
);

-- две активные привычки с одинаковым названием только запутают
CREATE UNIQUE INDEX habit_active_title_unique ON habit (player_id, lower(title)) WHERE archived_at IS NULL;
CREATE INDEX habit_player ON habit (player_id);

CREATE TABLE habit_completion (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    habit_id        BIGINT       NOT NULL REFERENCES habit (id) ON DELETE CASCADE,
    player_id       BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    -- день по часовому поясу игрока; его вычисляет сервер
    completed_on    DATE         NOT NULL,
    -- что было начислено (0/NULL — отметка сверх дневного лимита наград)
    life_seeds      INTEGER      NOT NULL CHECK (life_seeds >= 0),
    shard_item_key  VARCHAR(40)  REFERENCES item_def (key),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- главная защита от повторной награды: одна отметка на привычку в день
    CONSTRAINT habit_completion_once_per_day UNIQUE (habit_id, completed_on)
);

CREATE INDEX habit_completion_player_day ON habit_completion (player_id, completed_on);
