-- Каталог игры: категории кристаллов, растения и предметы. Repeatable-миграция:
-- Flyway перезапускает её при каждом изменении файла, поэтому всё пишется как upsert.
-- Удалять строки отсюда нельзя, если на них уже ссылаются данные игроков.

-- Кристаллы (docs/design/crystals.md) -----------------------------------------

INSERT INTO crystal_category (key, name, color, meaning, sort_order) VALUES
    ('emerald',  'Изумруд роста',         '#4fae6a', 'Учёба, навыки, постепенный рост',           1),
    ('amethyst', 'Аметист вдохновения',   '#9b6fc4', 'Творчество и создание нового',              2),
    ('sapphire', 'Сапфир странствий',     '#4a7fc9', 'Движение, прогулки, новые места',           3),
    ('amber',    'Янтарь очага',          '#e3a03a', 'Забота о себе, доме и своём пространстве',  4),
    ('rose',     'Розовый кварц связей',  '#e8a3b8', 'Близкие люди, доброта, поддержка',          5),
    ('ruby',     'Рубин искры',           '#c8424e', 'Решимость, начало и завершение дел',        6)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    color = EXCLUDED.color,
    meaning = EXCLUDED.meaning,
    sort_order = EXCLUDED.sort_order;

-- Растения --------------------------------------------------------------------

INSERT INTO plant_species (key, name, stage_minutes) VALUES
    ('radish',    'Редис',     ARRAY[10, 30]),
    ('chamomile', 'Ромашка',   ARRAY[30, 120]),
    ('sunflower', 'Подсолнух', ARRAY[60, 180, 360])
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    stage_minutes = EXCLUDED.stage_minutes;

-- Предметы --------------------------------------------------------------------
-- price — в Семенах жизни; NULL — не продаётся.

INSERT INTO item_def (key, kind, name, description, price, species_key, crystal_category) VALUES
    ('life_seed', 'CURRENCY', 'Семена жизни',
        'Тёплые искорки, которые сад получает, когда вы заботитесь о своей настоящей жизни.', NULL, NULL, NULL),

    ('shard_emerald',  'SHARD', 'Осколок изумруда',
        'Пахнет мокрой землёй после дождя. Внутри будто шевелятся корешки.', NULL, NULL, 'emerald'),
    ('shard_amethyst', 'SHARD', 'Осколок аметиста',
        'Если долго смотреть на грани, начинает казаться, что они что-то напевают.', NULL, NULL, 'amethyst'),
    ('shard_sapphire', 'SHARD', 'Осколок сапфира',
        'В глубине отражается небо, даже когда держишь его в тени.', NULL, NULL, 'sapphire'),
    ('shard_amber',    'SHARD', 'Осколок янтаря',
        'Тёплый, как подоконник после солнечного дня.', NULL, NULL, 'amber'),
    ('shard_rose',     'SHARD', 'Осколок розового кварца',
        'Светится мягче, когда рядом кто-то есть. Но и в одиночестве не гаснет.', NULL, NULL, 'rose'),
    ('shard_ruby',     'SHARD', 'Осколок рубина',
        'Немного горячий на ощупь. Как будто торопит, но вежливо.', NULL, NULL, 'ruby'),

    ('seed_radish',    'SEED', 'Пакетик семян редиса',
        'Нетерпеливый овощ. Взойдёт, пока вы пьёте чай.', 2, 'radish', NULL),
    ('seed_chamomile', 'SEED', 'Пакетик семян ромашки',
        'Растёт неспешно и пахнет летом даже в дождь.', 3, 'chamomile', NULL),
    ('seed_sunflower', 'SEED', 'Пакетик семян подсолнуха',
        'Долго тянется к солнцу, зато потом видно с другого конца сада.', 5, 'sunflower', NULL)
ON CONFLICT (key) DO UPDATE SET
    kind = EXCLUDED.kind,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    species_key = EXCLUDED.species_key,
    crystal_category = EXCLUDED.crystal_category;
