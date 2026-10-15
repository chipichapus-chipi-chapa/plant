-- Флаги игрока: что уже случилось в истории (знакомство с Вереском, шаги обучения).
-- Первичный ключ делает установку флага идемпотентной — а с ней и одноразовые подарки.
CREATE TABLE player_flag (
    player_id  BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    flag       VARCHAR(60)  NOT NULL,
    set_at     TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (player_id, flag)
);
