-- Урожай: взрослое растение собирают, грядка освобождается. Урожай — новый вид предметов: его дарят жителям.
ALTER TABLE item_def DROP CONSTRAINT item_def_kind_check;
ALTER TABLE item_def ADD CONSTRAINT item_def_kind_check
    CHECK (kind IN ('CURRENCY', 'SHARD', 'SEED', 'DECOR', 'TOOL', 'PRODUCE'));

-- Что даёт растение, когда его собрали, и сколько. NULL — собирать нечего (растение просто растёт).
ALTER TABLE plant_species ADD COLUMN produce_key VARCHAR(40) REFERENCES item_def (key);
ALTER TABLE plant_species ADD COLUMN produce_quantity INTEGER NOT NULL DEFAULT 1 CHECK (produce_quantity > 0);
