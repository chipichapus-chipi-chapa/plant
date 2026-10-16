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
    ('sun_spark', 'CURRENCY', 'Солнечная искра',
        'Кусочек давнего полудня. Пробуждает места, до которых обычной магии не дотянуться.', NULL, NULL, NULL),

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
        'Долго тянется к солнцу, зато потом видно с другого конца сада.', 5, 'sunflower', NULL),

    ('garden_tools', 'TOOL', 'Лопата и грабли',
        'Сняты с забора. Ручки отполированы чьими-то ладонями — сорнякам теперь не поздоровится.', NULL, NULL, NULL),
    ('repair_kit',   'TOOL', 'Ремонтный набор',
        'Гаечный ключ, молоток и пара новых шплинтов. Пахнет маслом и чужой аккуратностью.', NULL, NULL, NULL)
ON CONFLICT (key) DO UPDATE SET
    kind = EXCLUDED.kind,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    species_key = EXCLUDED.species_key,
    crystal_category = EXCLUDED.crystal_category;

-- Магические рецепты -----------------------------------------------------------
-- Ингредиенты пересоздаются целиком: на них не ссылаются данные игроков.

INSERT INTO recipe_def (key, name, description, target_object_key, result_text, sort_order, action_label) VALUES
    ('awaken_basin', 'Пробуждение каменной чаши',
        'Изумруд будит корни, аметист — свет. Вместе они вспомнят, как здесь цвело.',
        'stone-basin',
        'В чаше распустились светящиеся цветы. Ночью их, наверное, видно даже из окна сарая.', 1, 'Пробудить'),
    ('open_east_gate', 'Солнце для калитки',
        'Ежевика боится только настоящего солнца. Одной искры хватит, чтобы она вспомнила, что ей пора отдохнуть.',
        'east-gate',
        'Ежевика отступила, калитка скрипнула и открылась. За ней — тропа на восток. Куда она ведёт, узнаем в следующей главе.', 2, 'Пробудить'),
    ('repair_wheelbarrow', 'Починка тачки',
        'Поставить колесо на ось и забить новый шплинт. Ремонтный набор заперт в ящике в сарае.',
        'wheelbarrow',
        'Колесо встало на место и больше не скрипит. Тачка стоит ровно — кажется, даже гордо.', 3, 'Починить'),
    ('fill_barrel', 'Вода для бочки',
        'Сапфир странствий помнит дорогу к роднику. Принесите его с прогулки — и бочка вспомнит, что такое вода.',
        'barrel',
        'Бочка до краёв полна прохладной воды. В ней отражается небо — даже ночью.', 4, 'Наполнить')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    target_object_key = EXCLUDED.target_object_key,
    result_text = EXCLUDED.result_text,
    sort_order = EXCLUDED.sort_order,
    action_label = EXCLUDED.action_label;

DELETE FROM recipe_ingredient WHERE recipe_key IN ('awaken_basin', 'open_east_gate', 'repair_wheelbarrow', 'fill_barrel');
INSERT INTO recipe_ingredient (recipe_key, item_key, quantity) VALUES
    ('awaken_basin', 'shard_emerald', 2),
    ('awaken_basin', 'shard_amethyst', 1),
    ('open_east_gate', 'sun_spark', 1),
    ('repair_wheelbarrow', 'repair_kit', 1),
    ('fill_barrel', 'shard_sapphire', 1);

-- Артефакты -------------------------------------------------------------------
-- Лор раскрывается понемногу: через описание, легенду и подсказки к ещё не найденному.

INSERT INTO artifact_def (key, name, crystal_category, description, legend, acquisition_hint, effect_text, sort_order) VALUES
    ('seed_of_first_garden', 'Зерно первого сада', 'emerald',
        'Тёплое зерно с зелёной искрой внутри. Если поднести к уху, слышно, как где-то далеко капает вода.',
        'Говорят, первый садовник посадил это зерно в день, когда в поместье пришла вода. Сад вырос вокруг него — и, кажется, до сих пор помнит.',
        'Ищите там, куда падает свет пробуждённой чаши.',
        'Пока просто тёплое в ладони. Похоже, оно ещё проснётся.', 1),
    ('wanderer_compass', 'Компас странника', 'sapphire',
        'Стрелка указывает не на север, а туда, где вы ещё не были.',
        'Его носил тот, кто каждый вечер уходил по восточной тропе и возвращался с новыми семенами.',
        'Говорят, его обронили где-то за восточной калиткой.',
        'Покажет дорогу, когда дорога появится.', 2),
    ('hearth_lantern', 'Фонарь очага', 'amber',
        'Маленький фонарь с янтарным стеклом. Даже потухший, он греет руки.',
        'Когда-то в поместье его зажигали в первый холодный вечер — и все собирались на кухне.',
        'Его свет помнят стены поместья. Само поместье — далеко за садом.',
        'Когда-нибудь согреет целый дом.', 3)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    crystal_category = EXCLUDED.crystal_category,
    description = EXCLUDED.description,
    legend = EXCLUDED.legend,
    acquisition_hint = EXCLUDED.acquisition_hint,
    effect_text = EXCLUDED.effect_text,
    sort_order = EXCLUDED.sort_order;

-- Точки находок ---------------------------------------------------------------

INSERT INTO discovery_spot (key, prop_key, found_text, empty_text, requires_awakened, locked_text, artifact_key) VALUES
    ('rock_cache', 'rock-2',
        'Под камнями кто-то спрятал жестяную коробочку. Внутри — осколки, бережно завёрнутые в сухой лист.',
        'Под камнями пусто. Коробочка теперь служит домом для жука.',
        NULL, NULL, NULL),
    -- угол теперь внутри сарая (content/gardens/shed.json); ключ точки прежний — находки игроков сохраняются
    ('shed_corner', 'shed-corner',
        'Свет из каменной чаши падает в щель сарая. В углу, под старой рогожей, что-то мерцает — и греет ладонь.',
        'В сарае пахнет землёй и тишиной. Всё, что здесь было спрятано, уже у вас.',
        'stone-basin',
        'В сарае темно, ничего не разглядеть. Вот бы сюда немного света…',
        'seed_of_first_garden'),
    ('fence_tools', 'tools',
        'Вы снимаете с гвоздей лопату и грабли. Забор будто выдыхает с облегчением.',
        'На заборе остались только гвозди и светлые пятна там, где висели инструменты.',
        NULL, NULL, NULL)
ON CONFLICT (key) DO UPDATE SET
    prop_key = EXCLUDED.prop_key,
    found_text = EXCLUDED.found_text,
    empty_text = EXCLUDED.empty_text,
    requires_awakened = EXCLUDED.requires_awakened,
    locked_text = EXCLUDED.locked_text,
    artifact_key = EXCLUDED.artifact_key;

DELETE FROM discovery_spot_reward WHERE spot_key IN ('rock_cache', 'shed_corner', 'fence_tools');
INSERT INTO discovery_spot_reward (spot_key, item_key, quantity) VALUES
    ('rock_cache', 'shard_amethyst', 2),
    ('rock_cache', 'shard_emerald', 1),
    ('shed_corner', 'sun_spark', 1),
    ('fence_tools', 'garden_tools', 1);

-- Загадки ---------------------------------------------------------------------
-- Подсказка к ящику — в письме прежнего садовника (content/gardens/shed.json, постройка letter).

INSERT INTO puzzle_def (key, prop_key, prompt, answer, solved_text, wrong_text) VALUES
    ('toolbox_lock', 'toolbox',
        'На крышке замок с тремя колёсиками. На каждом — капля, солнце, луна и лист.',
        'drop,sun,moon',
        'Щёлк! Крышка поддаётся. Внутри — гаечный ключ, молоток и новые шплинты. Хватит, чтобы поставить колесо тачки на место.',
        'Замок не поддаётся. Может, в сарае есть подсказка?')
ON CONFLICT (key) DO UPDATE SET
    prop_key = EXCLUDED.prop_key,
    prompt = EXCLUDED.prompt,
    answer = EXCLUDED.answer,
    solved_text = EXCLUDED.solved_text,
    wrong_text = EXCLUDED.wrong_text;

DELETE FROM puzzle_symbol WHERE puzzle_key = 'toolbox_lock';
INSERT INTO puzzle_symbol (puzzle_key, symbol_key, name, sort_order) VALUES
    ('toolbox_lock', 'drop', 'Капля', 1),
    ('toolbox_lock', 'sun',  'Солнце', 2),
    ('toolbox_lock', 'moon', 'Луна', 3),
    ('toolbox_lock', 'leaf', 'Лист', 4);

DELETE FROM puzzle_reward WHERE puzzle_key = 'toolbox_lock';
INSERT INTO puzzle_reward (puzzle_key, item_key, quantity) VALUES
    ('toolbox_lock', 'repair_kit', 1);

-- Внешность персонажа ----------------------------------------------------------
-- Первый вариант каждого слота (по sort_order) — облик по умолчанию.

INSERT INTO appearance_slot (key, name, kind, sort_order) VALUES
    ('skin',         'Кожа',          'COLOR', 1),
    ('hair',         'Причёска',      'STYLE', 2),
    ('hair_color',   'Цвет волос',    'COLOR', 3),
    ('outfit',       'Одежда',        'STYLE', 4),
    ('outfit_color', 'Цвет одежды',   'COLOR', 5),
    ('accessory',    'Мелочь',        'STYLE', 6)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, sort_order = EXCLUDED.sort_order;

INSERT INTO appearance_option (slot_key, key, name, color, sort_order) VALUES
    ('skin', 'light',  'Светлая',      '#f7e1d2', 1),
    ('skin', 'warm',   'Тёплая',       '#e8c4a0', 2),
    ('skin', 'tan',    'Загорелая',    '#c99a6e', 3),
    ('skin', 'brown',  'Смуглая',      '#8d5f3e', 4),
    ('skin', 'deep',   'Тёмная',       '#5e3b26', 5),

    ('hair', 'short',  'Короткие',     NULL, 1),
    ('hair', 'bob',    'Каре',         NULL, 2),
    ('hair', 'long',   'Длинные',      NULL, 3),
    ('hair', 'braid',  'Коса',         NULL, 4),
    ('hair', 'bun',    'Пучок',        NULL, 5),
    ('hair', 'curly',  'Кудри',        NULL, 6),

    ('hair_color', 'chestnut', 'Каштановые',  '#7a4a2a', 1),
    ('hair_color', 'wheat',    'Пшеничные',   '#e3c27a', 2),
    ('hair_color', 'copper',   'Медные',      '#c8642e', 3),
    ('hair_color', 'black',    'Чёрные',      '#2f2a2e', 4),
    ('hair_color', 'silver',   'Седые',       '#d9d4cc', 5),
    ('hair_color', 'heather',  'Вересковые',  '#c98aa8', 6),

    ('outfit', 'overalls', 'Комбинезон', NULL, 1),
    ('outfit', 'sweater',  'Свитер',     NULL, 2),
    ('outfit', 'dress',    'Сарафан',    NULL, 3),

    ('outfit_color', 'olive',   'Олива',     '#7d8a3e', 0),
    ('outfit_color', 'moss',    'Мох',       '#5f8a3a', 1),
    ('outfit_color', 'sky',     'Небо',      '#4a7fc9', 2),
    ('outfit_color', 'berry',   'Ягода',     '#b5485a', 3),
    ('outfit_color', 'mustard', 'Горчица',   '#d99a2b', 4),
    ('outfit_color', 'cream',   'Сливки',    '#e8d9b5', 5),
    ('outfit_color', 'plum',    'Слива',     '#7a4a8a', 6),

    ('accessory', 'none',         'Ничего',              NULL, 1),
    ('accessory', 'gardener_hat', 'Шляпа садовника',     NULL, 2),
    ('accessory', 'straw_hat',    'Соломенная шляпа',    NULL, 3),
    ('accessory', 'scarf',        'Шарф',                NULL, 4),
    ('accessory', 'glasses',      'Очки',                NULL, 5),
    ('accessory', 'flower',       'Цветок в волосах',    NULL, 6)
ON CONFLICT (slot_key, key) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;
