-- Артефакты: уникальные коллекционные кристаллы (контент) ------------------------
CREATE TABLE artifact_def (
    key               VARCHAR(40)   PRIMARY KEY,
    name              VARCHAR(80)   NOT NULL,
    crystal_category  VARCHAR(40)   NOT NULL REFERENCES crystal_category (key),
    description       VARCHAR(300)  NOT NULL,
    legend            VARCHAR(600)  NOT NULL,
    -- подсказка, где искать, — видна игроку, пока артефакт не найден
    acquisition_hint  VARCHAR(300)  NOT NULL,
    -- что артефакт даёт (пока — описание; механика эффектов появится позже)
    effect_text       VARCHAR(300)  NOT NULL,
    sort_order        SMALLINT      NOT NULL
);

-- Коллекция игрока: артефакт либо есть, либо нет; дубль невозможен, расходовать нечего
CREATE TABLE player_artifact (
    player_id     BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    artifact_key  VARCHAR(40)  NOT NULL REFERENCES artifact_def (key),
    found_at      TIMESTAMPTZ  NOT NULL,
    -- где найден (ключ точки находки)
    found_where   VARCHAR(40)  NOT NULL,
    PRIMARY KEY (player_id, artifact_key)
);

-- Точки находок (контент): привязаны к постройкам карты сада ---------------------
CREATE TABLE discovery_spot (
    key                VARCHAR(40)   PRIMARY KEY,
    -- ключ постройки из content/gardens/*.json; согласованность проверяется при старте
    prop_key           VARCHAR(40)   NOT NULL UNIQUE,
    found_text         VARCHAR(400)  NOT NULL,
    -- что видит игрок, когда здесь уже всё найдено
    empty_text         VARCHAR(300)  NOT NULL,
    -- условие: нужно сначала пробудить объект мира (иначе — locked_text)
    requires_awakened  VARCHAR(40),
    locked_text        VARCHAR(300),
    artifact_key       VARCHAR(40)   REFERENCES artifact_def (key),
    CHECK (requires_awakened IS NULL OR locked_text IS NOT NULL)
);

CREATE TABLE discovery_spot_reward (
    spot_key  VARCHAR(40)  NOT NULL REFERENCES discovery_spot (key) ON DELETE CASCADE,
    item_key  VARCHAR(40)  NOT NULL REFERENCES item_def (key),
    quantity  INTEGER      NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (spot_key, item_key)
);

-- Обысканные точки: каждая находка — один раз, «докликать» до бесконечности нельзя
CREATE TABLE player_discovery (
    player_id  BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    spot_key   VARCHAR(40)  NOT NULL REFERENCES discovery_spot (key),
    found_at   TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (player_id, spot_key)
);
