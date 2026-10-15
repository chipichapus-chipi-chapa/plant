-- Что игрок разместил в саду. Пока это растения; декор добавится сюда же новым kind.
CREATE TABLE garden_object (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id    BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    -- какая локация (карта из content/gardens); сейчас только домашний сад
    garden_key   VARCHAR(40)  NOT NULL DEFAULT 'home',
    x            SMALLINT     NOT NULL CHECK (x >= 0),
    y            SMALLINT     NOT NULL CHECK (y >= 0),
    kind         VARCHAR(16)  NOT NULL CHECK (kind IN ('PLANT')),
    species_key  VARCHAR(40)  REFERENCES plant_species (key),
    -- от этого момента сервер считает стадию роста; растения не вянут
    planted_at   TIMESTAMPTZ  NOT NULL,
    CHECK (kind <> 'PLANT' OR species_key IS NOT NULL),
    -- в одной клетке — один объект
    CONSTRAINT garden_object_one_per_cell UNIQUE (player_id, garden_key, x, y)
);
