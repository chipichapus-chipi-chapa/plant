-- Каталог растений и предметов. Repeatable-миграция: Flyway перезапускает её
-- при каждом изменении файла, поэтому всё пишется как upsert.
-- Удалять строки отсюда нельзя, если на них уже ссылаются данные игроков.

INSERT INTO plant_species (key, name, stage_minutes) VALUES
    ('radish',    'Редис',     ARRAY[10, 30]),
    ('chamomile', 'Ромашка',   ARRAY[30, 120]),
    ('sunflower', 'Подсолнух', ARRAY[60, 180, 360])
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    stage_minutes = EXCLUDED.stage_minutes;

INSERT INTO item_def (key, kind, name, description, price, species_key) VALUES
    ('seed_radish',    'SEED', 'Семена редиса',     'Нетерпеливый овощ. Взойдёт, пока вы пьёте чай.',          5, 'radish'),
    ('seed_chamomile', 'SEED', 'Семена ромашки',    'Растёт неспешно и пахнет летом даже в дождь.',             8, 'chamomile'),
    ('seed_sunflower', 'SEED', 'Семена подсолнуха', 'Долго тянется к солнцу, зато потом видно с другого конца сада.', 12, 'sunflower')
ON CONFLICT (key) DO UPDATE SET
    kind = EXCLUDED.kind,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    species_key = EXCLUDED.species_key;
