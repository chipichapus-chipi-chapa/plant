-- История покупок и защита от двойного списания.
-- Клиент присылает уникальный Idempotency-Key на каждое намерение купить;
-- повтор запроса с тем же ключом (двойной клик, переотправка после обрыва сети)
-- находит уже сделанную покупку и не списывает Семена жизни второй раз.
CREATE TABLE shop_purchase (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id        BIGINT       NOT NULL REFERENCES player_profile (user_id) ON DELETE CASCADE,
    idempotency_key  UUID         NOT NULL,
    item_key         VARCHAR(40)  NOT NULL REFERENCES item_def (key),
    quantity         INTEGER      NOT NULL CHECK (quantity > 0),
    -- сколько Семян жизни списано (цена на момент покупки)
    cost             INTEGER      NOT NULL CHECK (cost > 0),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT shop_purchase_idempotent UNIQUE (player_id, idempotency_key)
);
