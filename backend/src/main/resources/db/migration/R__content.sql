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
    ('sunflower', 'Подсолнух', ARRAY[60, 180, 360]),
    ('lily',      'Розовая лилия', ARRAY[120, 480]),
    -- цветы из городка у мельницы (глава 2)
    ('iris',      'Ирис',       ARRAY[90, 240]),
    ('rose',      'Роза',       ARRAY[120, 360]),
    ('daisy',     'Маргаритки', ARRAY[20, 60]),
    -- с Лунной поляны: выросший светится в саду голубым
    ('moonflower', 'Лунный цветок', ARRAY[60, 180])
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    stage_minutes = EXCLUDED.stage_minutes;

-- Предметы --------------------------------------------------------------------
-- price — в Семенах жизни; NULL — не продаётся.

INSERT INTO item_def (key, kind, name, description, price, species_key, crystal_category, unlock_errand) VALUES
    ('life_seed', 'CURRENCY', 'Семена жизни',
        'Тёплые искорки, которые сад получает, когда вы заботитесь о своей настоящей жизни.', NULL, NULL, NULL, NULL),
    ('sun_spark', 'CURRENCY', 'Солнечная искра',
        'Кусочек давнего полудня. Пробуждает места, до которых обычной магии не дотянуться.', NULL, NULL, NULL, NULL),

    ('shard_emerald',  'SHARD', 'Осколок изумруда',
        'Пахнет мокрой землёй после дождя. Внутри будто шевелятся корешки.', NULL, NULL, 'emerald', NULL),
    ('shard_amethyst', 'SHARD', 'Осколок аметиста',
        'Если долго смотреть на грани, начинает казаться, что они что-то напевают.', NULL, NULL, 'amethyst', NULL),
    ('shard_sapphire', 'SHARD', 'Осколок сапфира',
        'В глубине отражается небо, даже когда держишь его в тени.', NULL, NULL, 'sapphire', NULL),
    ('shard_amber',    'SHARD', 'Осколок янтаря',
        'Тёплый, как подоконник после солнечного дня.', NULL, NULL, 'amber', NULL),
    ('shard_rose',     'SHARD', 'Осколок розового кварца',
        'Светится мягче, когда рядом кто-то есть. Но и в одиночестве не гаснет.', NULL, NULL, 'rose', NULL),
    ('shard_ruby',     'SHARD', 'Осколок рубина',
        'Немного горячий на ощупь. Как будто торопит, но вежливо.', NULL, NULL, 'ruby', NULL),

    ('seed_radish',    'SEED', 'Пакетик семян редиса',
        'Нетерпеливый овощ. Взойдёт, пока вы пьёте чай.', 2, 'radish', NULL, NULL),
    ('seed_chamomile', 'SEED', 'Пакетик семян ромашки',
        'Растёт неспешно и пахнет летом даже в дождь.', 3, 'chamomile', NULL, NULL),
    ('seed_sunflower', 'SEED', 'Пакетик семян подсолнуха',
        'Долго тянется к солнцу, зато потом видно с другого конца сада.', 5, 'sunflower', NULL, NULL),

    ('seed_lily', 'SEED', 'Луковица розовой лилии',
        'Из шкатулки в поместье. Говорят, из такой же выросли исполинские лилии в саду садовника.', NULL, 'lily', NULL, NULL),

    ('garden_tools', 'TOOL', 'Лопата и грабли',
        'Сняты с забора. Ручки отполированы чьими-то ладонями — сорнякам теперь не поздоровится.', NULL, NULL, NULL, NULL),
    ('repair_kit',   'TOOL', 'Ремонтный набор',
        'Гаечный ключ, молоток и пара новых шплинтов. Пахнет маслом и чужой аккуратностью.', NULL, NULL, NULL, NULL),
    ('gardener_hat', 'TOOL', 'Соломенная шляпа с подсолнухом',
        'Шляпа садовника Ефима. Сухая, чуть мятая. Подсолнух на полях держится так, будто пустил корни.', NULL, NULL, NULL, NULL),
    ('old_lantern',  'TOOL', 'Старый фонарь',
        'Фонарь прежнего садовника. Стекло в трещинках, но фитиль цел — с ним не страшно и в чаще.', NULL, NULL, NULL, NULL),

    ('seed_iris',  'SEED', 'Луковица синего ириса',
        'От Лизы из городка у мельницы. Любит воду и небо — и немножко сапфира.', 4, 'iris', NULL, 'liza_irises'),
    ('seed_rose',  'SEED', 'Черенок розы Агаты',
        'Колючая, но очень благодарная. Росла у крыльца поместья, пока все не уплыли.', 6, 'rose', NULL, 'liza_irises'),
    ('seed_daisy', 'SEED', 'Пакетик маргариток',
        'Ника собирала их сама. Маленькие, но их много — любят, когда на них смотрят.', 3, 'daisy', NULL, 'liza_irises'),
    ('seed_moonflower', 'SEED', 'Семена лунного цветка',
        'От совы Ухты с Лунной поляны. Сажайте там, где смотрите перед сном, — тогда цветок точно проснётся и будет светиться.', 5, 'moonflower', NULL, 'owl_moonstone'),

    -- урожай: собирают со взрослых растений
    ('produce_radish',     'PRODUCE', 'Пучок редиса',
        'Хрустящий и чуть острый. Мыши уверены, что редис — это просто очень смелая морковка.', NULL, NULL, NULL, NULL),
    ('produce_chamomile',  'PRODUCE', 'Букетик ромашек',
        'Если заварить — получится чай, после которого хорошо спится.', NULL, NULL, NULL, NULL),
    ('produce_sunflower',  'PRODUCE', 'Корзинка семечек',
        'Полосатые, тёплые от солнца. Бобры за них готовы построить ещё одну плотину.', NULL, NULL, NULL, NULL),
    ('produce_lily',       'PRODUCE', 'Розовая лилия',
        'Пахнет так, что сад на минутку замолкает.', NULL, NULL, NULL, NULL),
    ('produce_iris',       'PRODUCE', 'Синий ирис',
        'Цвета вечернего неба над озером.', NULL, NULL, NULL, NULL),
    ('produce_rose',       'PRODUCE', 'Роза',
        'Колючая и очень красивая — как многие, кто долго ждал.', NULL, NULL, NULL, NULL),
    ('produce_daisy',      'PRODUCE', 'Венок из маргариток',
        'Ника научила плести: три цветка, перекрестить, ещё три.', NULL, NULL, NULL, NULL),
    ('produce_moonflower', 'PRODUCE', 'Лунный цветок',
        'Светится в ладонях голубым. Днём засыпает, но не вянет.', NULL, NULL, NULL, NULL),
    ('fair_ribbon', 'DECOR', 'Голубая лента «Лучший сад»',
        'Награда осенней ярмарки. Мельник вышивал буквы сам — «С» получилась немного кривой, и от этого лента ещё дороже.', NULL, NULL, NULL, NULL)
ON CONFLICT (key) DO UPDATE SET
    kind = EXCLUDED.kind,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    species_key = EXCLUDED.species_key,
    crystal_category = EXCLUDED.crystal_category,
    unlock_errand = EXCLUDED.unlock_errand;

-- что даёт каждое растение, когда его собрали
UPDATE plant_species p SET produce_key = v.produce_key, produce_quantity = v.quantity
FROM (VALUES ('radish', 'produce_radish', 2), ('chamomile', 'produce_chamomile', 1), ('sunflower', 'produce_sunflower', 1),
             ('lily', 'produce_lily', 1), ('iris', 'produce_iris', 1), ('rose', 'produce_rose', 1),
             ('daisy', 'produce_daisy', 1), ('moonflower', 'produce_moonflower', 1)) AS v (species, produce_key, quantity)
WHERE p.key = v.species;

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
        'Бочка до краёв полна прохладной воды. В ней отражается небо — даже ночью.', 4, 'Наполнить'),
    ('wake_lily_west', 'Западная лилия',
        'Розовый кварц — кристалл тех, кто рядом. Эта лилия скучает по людям больше остальных.',
        'lily-west', 'Лилия поднимает голову, лепестки раскрываются — и внутри загорается мягкий розовый свет.', 5, 'Пробудить'),
    ('wake_lily_east', 'Восточная лилия',
        'Изумруд роста напомнит ей, как тянуться вверх.',
        'lily-east', 'Стебель выпрямляется со вздохом, и восточная лилия светится, как фонарь из лепестков.', 6, 'Пробудить'),
    ('wake_lily_south', 'Южная лилия',
        'Янтарь очага — тёплый, как кухня Агаты. Южной лилии не хватает именно тепла.',
        'lily-south', 'Южная лилия раскрывается медленно, будто потягивается после долгого сна. Пахнет мёдом.', 7, 'Пробудить'),
    ('fill_manor_well', 'Вода для колодца',
        'Сапфир странствий приводит воду туда, где гуляют. Клумбы ждут её давно.',
        'manor-well', 'Где-то глубоко булькает, и ведро поднимается полным. Клумбы вокруг вздыхают — и расцветают.', 8, 'Наполнить'),
    ('light_lamp_post', 'Первый холодный вечер',
        'Фонарь зажигают в первый холодный вечер. Солнечной искры хватит, чтобы он вспомнил, как это.',
        'lamp-post', 'Фонарь вспыхивает тёплым светом. Табличка под ним больше не грустит.', 9, 'Зажечь'),
    ('light_hearth', 'Огонь в очаге',
        'Янтарь очага помнит, как здесь было тепло, а Солнечная искра — как разгорается огонь. Вместе они разбудят печь.',
        'hearth', 'Угли вздохнули, и в печи заплясал огонь. Кухня сразу стала меньше и уютнее — как и положено кухне.', 10, 'Разжечь'),
    ('build_lodge', 'Хатка для бобров',
        'Изумруд — чтобы дом рос крепко, как дерево; сапфир — чтобы помнил дорогу к воде.',
        'beaver-lodge', 'Ветки сплелись в тёплый купол, мох лёг на макушку. У бобров снова есть дом — а у сада снова есть вода.', 11, 'Построить'),
    ('light_glade_lamp_1', 'Огонёк для фонаря',
        'Аметист светится, когда что-то создаёшь. Положите его в каменный фонарь — и поляна станет светлее.',
        'glade-lamp-1', 'Фонарь наверху слева загорается мягким лиловым светом. Лунные цветы рядом будто придвинулись поближе.', 12, 'Зажечь'),
    ('light_glade_lamp_2', 'Огонёк для фонаря',
        'Аметист светится, когда что-то создаёшь. Положите его в каменный фонарь — и поляна станет светлее.',
        'glade-lamp-2', 'Фонарь наверху справа загорается мягким лиловым светом. Лунные цветы рядом будто придвинулись поближе.', 13, 'Зажечь'),
    ('light_glade_lamp_3', 'Огонёк для фонаря',
        'Аметист светится, когда что-то создаёшь. Положите его в каменный фонарь — и поляна станет светлее.',
        'glade-lamp-3', 'Фонарь у тропки загорается мягким лиловым светом. Лунные цветы рядом будто придвинулись поближе.', 14, 'Зажечь'),
    ('wake_star_tree_1', 'Свет для хрустального дерева',
        'Аметист напомнит дереву, как светиться, а сапфир — дорогу к звёздной воде.',
        'star-tree-1', 'Стекло теплеет изнутри, листья вспыхивают лиловым и звенят — будто смеются.', 15, 'Разбудить'),
    ('wake_star_tree_2', 'Свет для хрустального дерева',
        'Аметист напомнит дереву, как светиться, а сапфир — дорогу к звёздной воде.',
        'star-tree-2', 'Хрустальные листья загораются один за другим, и по траве бегут искорки.', 16, 'Разбудить'),
    -- осенняя ярмарка: прилавки заполняют своим урожаем
    ('fill_stall_flowers', 'Цветочный прилавок',
        'Роза, ирис и маргаритки — всё, что выросло на ваших грядках.',
        'fair-stall-flowers', 'Цветы встают в горшки и вёдра, навес будто становится ярче. Кто-то уже остановился понюхать розу.', 17, 'Разложить'),
    ('fill_stall_veg', 'Овощной прилавок',
        'Пара пучков редиса и корзинка семечек — для тех, кто придёт голодным.',
        'fair-stall-veg', 'Редис ложится аккуратной горкой, семечки — в бумажные кулёчки. Пахнет землёй и летом.', 18, 'Разложить'),
    ('fill_stall_moon', 'Вечерний прилавок',
        'Лунный цветок — для фонарика, лилия — для красоты, ромашки — для чая.',
        'fair-stall-moon', 'Лунный цветок повисает на крючке и светится, как фонарик. Рядом в чайнике заваривается ромашка.', 19, 'Разложить')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    target_object_key = EXCLUDED.target_object_key,
    result_text = EXCLUDED.result_text,
    sort_order = EXCLUDED.sort_order,
    action_label = EXCLUDED.action_label;

DELETE FROM recipe_ingredient WHERE recipe_key IN ('awaken_basin', 'open_east_gate', 'repair_wheelbarrow', 'fill_barrel',
    'wake_lily_west', 'wake_lily_east', 'wake_lily_south', 'fill_manor_well', 'light_lamp_post', 'light_hearth', 'build_lodge', 'light_glade_lamp_1', 'light_glade_lamp_2', 'light_glade_lamp_3', 'wake_star_tree_1', 'wake_star_tree_2',
    'fill_stall_flowers', 'fill_stall_veg', 'fill_stall_moon');
INSERT INTO recipe_ingredient (recipe_key, item_key, quantity) VALUES
    ('awaken_basin', 'shard_emerald', 2),
    ('awaken_basin', 'shard_amethyst', 1),
    ('open_east_gate', 'sun_spark', 1),
    ('repair_wheelbarrow', 'repair_kit', 1),
    ('fill_barrel', 'shard_sapphire', 1),
    ('wake_lily_west', 'shard_rose', 1),
    ('wake_lily_east', 'shard_emerald', 1),
    ('wake_lily_south', 'shard_amber', 1),
    ('fill_manor_well', 'shard_sapphire', 1),
    ('light_lamp_post', 'sun_spark', 1),
    ('light_hearth', 'shard_amber', 2),
    ('light_hearth', 'sun_spark', 1),
    ('build_lodge', 'shard_emerald', 2),
    ('build_lodge', 'shard_sapphire', 1),
    ('light_glade_lamp_1', 'shard_amethyst', 1),
    ('light_glade_lamp_2', 'shard_amethyst', 1),
    ('light_glade_lamp_3', 'shard_amethyst', 1),
    ('wake_star_tree_1', 'shard_amethyst', 1),
    ('wake_star_tree_1', 'shard_sapphire', 1),
    ('wake_star_tree_2', 'shard_amethyst', 1),
    ('wake_star_tree_2', 'shard_sapphire', 1),
    ('fill_stall_flowers', 'produce_rose', 1),
    ('fill_stall_flowers', 'produce_iris', 1),
    ('fill_stall_flowers', 'produce_daisy', 1),
    ('fill_stall_veg', 'produce_radish', 2),
    ('fill_stall_veg', 'produce_sunflower', 1),
    ('fill_stall_moon', 'produce_moonflower', 1),
    ('fill_stall_moon', 'produce_lily', 1),
    ('fill_stall_moon', 'produce_chamomile', 1);

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
        'Его свет помнят стены поместья. Само поместье — за чащей, куда не пускает сторож.',
        'Когда-нибудь согреет целый дом.', 3),
    ('agata_ring', 'Кольцо Агаты', 'rose',
        'Тонкое колечко с розовым камешком. Внутри выгравировано: «Возвращайся к чаю».',
        'Агата снимала кольцо, когда месила тесто, и прятала его в часы с кукушкой — чтобы точно не потерять. Однажды уплыла и забыла.',
        'Без четверти пять — время пить чай. И время для секретов.',
        'Пока у вас, в поместье кто-то ждёт к чаю.', 4),
    ('gardener_song', 'Ноты песни садовника', 'amethyst',
        'Свёрнутый листок с нотами и пятнами от чая. Мелодия простая, слова — смешные.',
        'Ту самую песню, за которую цапля отдала луковицу лилии. Цапля говорит, песня была плохая. Цапля лукавит.',
        'Тот, кто сядет отдохнуть у воды, услышит песню.',
        'Если напеть её лилиям, они, кажется, светятся ярче.', 5),
    ('moonstone', 'Лунный камень', 'amethyst',
        'Гладкий камешек, внутри которого лежит лунный блик и не уходит даже днём.',
        'Луна уронила его, когда смотрелась в пруд на поляне. Сова Ухта уверена, что луна до сих пор его ищет.',
        'Ночью, у тихой воды, ищите блик, который не уходит.',
        'Пока просто светится в ладони. Может быть, однажды покажет дорогу в темноте.', 6),
    ('kitten_bell', 'Колокольчик Искорки', 'rose',
        'Крошечный серебряный колокольчик. Звенит так тихо, что слышно только тем, кто прислушивается.',
        'Мурлана повесила его котёнку на шею, чтобы та не терялась в Светлолесье. Потерялся — колокольчик.',
        'В Светлолесье что-то звенит в светящемся кусте.',
        'Если позвенеть перед сном, сны получаются светлее.', 7)
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
        NULL, NULL, NULL),
    ('hearth_glow', 'hearth',
        'В остывшей золе — маленький фонарь с янтарным стеклом. Он тёплый, хотя печь давно не топили.',
        'В печи только зола. Фонарь очага уже у вас — и он всё такой же тёплый.',
        NULL, NULL, 'hearth_lantern'),
    ('bridge_compass', 'bridge-post',
        'Между мокрыми камнями у опоры — старый компас. Стрелка дрожит и показывает не на север, а куда-то в чащу.',
        'У опоры моста только мох и холодная вода. Компас уже у вас.',
        NULL, NULL, 'wanderer_compass')
ON CONFLICT (key) DO UPDATE SET
    prop_key = EXCLUDED.prop_key,
    found_text = EXCLUDED.found_text,
    empty_text = EXCLUDED.empty_text,
    requires_awakened = EXCLUDED.requires_awakened,
    locked_text = EXCLUDED.locked_text,
    artifact_key = EXCLUDED.artifact_key;

-- Секретки: без мерцания, со своей надписью на кнопке. Мерцающие тайники — тоже со своими надписями.
INSERT INTO discovery_spot (key, prop_key, found_text, empty_text, requires_awakened, locked_text, artifact_key, hidden, action_label) VALUES
    ('rock_whisper', 'rock-1',
        'Под камнем — записка садовника: «Кто поднимает обычные камни, тот находит необычное». И пригоршня тёплых семян.',
        'Под камнем только мокрица. Она смотрит на вас с упрёком.', NULL, NULL, NULL, TRUE, 'Приподнять камень'),
    ('shelf_jar', 'shelf',
        'На дне банки из-под семян — забытый пакетик подсолнуха. Пахнет летом.',
        'Банка пустая. Только запах лета остался.', NULL, NULL, NULL, TRUE, 'Заглянуть в банку'),
    ('burrow_knock', 'mouse-hole',
        'Тук-тук… Дверца приоткрывается, маленькая лапка протягивает жёлудь и тёплый янтарный осколок: «За то, что постучал. Все обычно не стучат».',
        'Из норы шёпотом: «Мы уже дали! Заходи к чаю, но без стука можно».', NULL, NULL, NULL, TRUE, 'Постучать'),
    ('clock_teatime', 'cuckoo-clock',
        'Вы ставите стрелки на без четверти пять. Кукушка выскакивает — и роняет вам в ладонь колечко.',
        'Кукушка выглядывает, видит, что колечка нет, и обиженно прячется.', NULL, NULL, 'agata_ring', TRUE, 'Подвести стрелки'),
    ('oak_swing', 'oak',
        'Качели скрипят, ветер шумит в листьях — и с ветки падает жёлудь-копилка. Внутри — Солнечная искра.',
        'Качели скрипят. Просто приятно покачаться.', NULL, NULL, NULL, TRUE, 'Покачаться'),
    ('bench_song', 'lake-bench',
        'Вы сидите, слушаете туман… Под скамейкой — свёрнутые ноты. Та самая песня садовника.',
        'Туман дышит над водой. Хорошо просто посидеть.', NULL, NULL, 'gardener_song', TRUE, 'Посидеть'),
    ('moonstone', 'pond-stone',
        'Вы поднимаете камень — и блик остаётся в нём, тёплый и голубой. Это лунный камень.',
        'У пруда тихо. Луна смотрится в воду и, кажется, улыбается.', NULL, NULL, 'moonstone', FALSE, 'Поднять камень'),
    ('kitten_bell', 'glow-bush',
        'Вы осторожно раздвигаете светящиеся ветки — дзинь! На донышке куста лежит крошечный колокольчик.',
        'В кусте тихо. Только грибы рядом светятся чуть ярче — будто довольны.', NULL, NULL, 'kitten_bell', FALSE, 'Заглянуть в куст')
ON CONFLICT (key) DO UPDATE SET
    prop_key = EXCLUDED.prop_key,
    found_text = EXCLUDED.found_text,
    empty_text = EXCLUDED.empty_text,
    artifact_key = EXCLUDED.artifact_key,
    hidden = EXCLUDED.hidden,
    action_label = EXCLUDED.action_label;

UPDATE discovery_spot SET action_label = 'Снять с забора' WHERE key = 'fence_tools';
UPDATE discovery_spot SET action_label = 'Заглянуть под мост' WHERE key = 'bridge_compass';
UPDATE discovery_spot SET action_label = 'Заглянуть в печь' WHERE key = 'hearth_glow';
UPDATE discovery_spot SET action_label = 'Заглянуть под рогожу' WHERE key = 'shed_corner';
UPDATE discovery_spot SET action_label = 'Заглянуть под камни' WHERE key = 'rock_cache';

DELETE FROM discovery_spot_reward WHERE spot_key IN ('rock_cache', 'shed_corner', 'fence_tools', 'bridge_compass', 'hearth_glow',
    'rock_whisper', 'shelf_jar', 'burrow_knock', 'oak_swing', 'moonstone', 'kitten_bell');
INSERT INTO discovery_spot_reward (spot_key, item_key, quantity) VALUES
    ('rock_cache', 'shard_amethyst', 2),
    ('rock_cache', 'shard_emerald', 1),
    ('shed_corner', 'sun_spark', 1),
    ('fence_tools', 'garden_tools', 1),
    ('bridge_compass', 'life_seed', 3),
    ('hearth_glow', 'sun_spark', 1),
    ('rock_whisper', 'life_seed', 3),
    ('shelf_jar', 'seed_sunflower', 1),
    ('burrow_knock', 'shard_amber', 1),
    ('burrow_knock', 'life_seed', 1),
    ('oak_swing', 'sun_spark', 1),
    ('moonstone', 'life_seed', 2),
    ('kitten_bell', 'life_seed', 1);

-- Загадки ---------------------------------------------------------------------
-- Подсказка к ящику — в письме прежнего садовника (content/gardens/shed.json, постройка letter).

INSERT INTO puzzle_def (key, prop_key, prompt, answer, solved_text, wrong_text) VALUES
    ('cupboard_lock', 'cupboard',
        'Нижний ящик буфета заперт. На замке три колёсика: ягода, мёд, черника и мята.',
        'berry,honey,blueberry',
        'Щёлк — и ящик выезжает с довольным скрипом. Внутри — банка «того самого» варенья и тёплая Солнечная искра, завёрнутая в салфетку.',
        'Ящик не поддаётся. Может, порядок как-то связан с рецептом на столе?'),
    ('season_box', 'music-box',
        'На крышке шкатулки четыре колёсика: капля, солнце, лист и луна.',
        'drop,sun,leaf,moon',
        'Крышка открывается, и шкатулка играет тихий вальс. На бархате лежит луковица розовой лилии — тёплая, будто живая.',
        'Шкатулка молчит. Наверное, колёсики надо поставить так, как идёт год.'),
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

DELETE FROM puzzle_symbol WHERE puzzle_key IN ('toolbox_lock', 'cupboard_lock', 'season_box');
INSERT INTO puzzle_symbol (puzzle_key, symbol_key, name, sort_order) VALUES
    ('cupboard_lock', 'berry',     'Ягода',   1),
    ('cupboard_lock', 'honey',     'Мёд',     2),
    ('cupboard_lock', 'blueberry', 'Черника', 3),
    ('cupboard_lock', 'mint',      'Мята',    4),
    ('season_box', 'drop', 'Капля',  1),
    ('season_box', 'sun',  'Солнце', 2),
    ('season_box', 'leaf', 'Лист',   3),
    ('season_box', 'moon', 'Луна',   4),
    ('toolbox_lock', 'drop', 'Капля', 1),
    ('toolbox_lock', 'sun',  'Солнце', 2),
    ('toolbox_lock', 'moon', 'Луна', 3),
    ('toolbox_lock', 'leaf', 'Лист', 4);

DELETE FROM puzzle_reward WHERE puzzle_key IN ('toolbox_lock', 'cupboard_lock', 'season_box');
INSERT INTO puzzle_reward (puzzle_key, item_key, quantity) VALUES
    ('cupboard_lock', 'sun_spark', 1),
    ('cupboard_lock', 'life_seed', 5),
    ('season_box', 'seed_lily', 1),
    ('toolbox_lock', 'repair_kit', 1);

-- Внешность персонажа ----------------------------------------------------------
-- Первый вариант каждого слота (по sort_order) — облик по умолчанию.

INSERT INTO appearance_slot (key, name, kind, sort_order) VALUES
    ('skin',         'Кожа',          'COLOR', 1),
    ('hair',         'Причёска',      'STYLE', 2),
    ('hair_color',   'Цвет волос',    'COLOR', 3),
    ('outfit',       'Одежда',        'STYLE', 4),
    ('outfit_color', 'Цвет одежды',   'COLOR', 5),
    ('accessory',    'Мелочь',        'STYLE', 6),
    ('bag',          'Сумка',         'STYLE', 7)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, sort_order = EXCLUDED.sort_order;

INSERT INTO appearance_option (slot_key, key, name, color, sort_order) VALUES
    ('skin', 'light',  'Светлая',      '#f7e1d2', 1),
    ('skin', 'warm',   'Тёплая',       '#e8c4a0', 2),
    ('skin', 'tan',    'Загорелая',    '#c99a6e', 3),
    ('skin', 'brown',  'Смуглая',      '#8d5f3e', 4),
    ('skin', 'deep',   'Тёмная',       '#5e3b26', 5),

    ('hair', 'bob',      'Лохматое каре', NULL, 1),
    ('hair', 'gathered', 'Собранные',     NULL, 2),
    ('hair', 'long',     'Длинные',       NULL, 3),
    ('hair', 'bun',      'Пучок',         NULL, 4),
    ('hair', 'braid',    'Коса',          NULL, 5),
    ('hair', 'short',    'Короткие',      NULL, 6),
    ('hair', 'curly',    'Кудри',         NULL, 7),

    ('hair_color', 'cocoa',    'Какао',       '#5a3b2a', 0),
    ('hair_color', 'chestnut', 'Каштановые',  '#7a4a2a', 1),
    ('hair_color', 'wheat',    'Пшеничные',   '#e3c27a', 2),
    ('hair_color', 'copper',   'Медные',      '#c8642e', 3),
    ('hair_color', 'black',    'Чёрные',      '#2f2a2e', 4),
    ('hair_color', 'silver',   'Седые',       '#d9d4cc', 5),
    ('hair_color', 'heather',  'Вересковые',  '#c98aa8', 6),
    ('hair_color', 'ash',      'Пепельные',   '#d8c8a8', 7),

    ('outfit', 'casual',   'Куртка и худи', NULL, 1),
    ('outfit', 'sport',    'Спортивный',    NULL, 2),
    ('outfit', 'grunge',   'Гранж',         NULL, 3),
    ('outfit', 'dress',    'Платье',        NULL, 4),
    ('outfit', 'winter',   'Зимний',        NULL, 5),
    ('outfit', 'sweater',  'Домашний',      NULL, 6),
    ('outfit', 'overalls', 'Комбинезон',    NULL, 7),

    ('outfit_color', 'olive',   'Олива',     '#6b7a4a', 0),
    ('outfit_color', 'moss',    'Мох',       '#5f8a3a', 1),
    ('outfit_color', 'sky',     'Небо',      '#4a7fc9', 2),
    ('outfit_color', 'berry',   'Ягода',     '#b5485a', 3),
    ('outfit_color', 'mustard', 'Горчица',   '#d99a2b', 4),
    ('outfit_color', 'cream',   'Сливки',    '#e8d9b5', 5),
    ('outfit_color', 'plum',    'Слива',     '#7a4a8a', 6),

    ('accessory', 'leaf_clip',    'Заколка-листик',      NULL, 0),
    ('accessory', 'none',         'Ничего',              NULL, 1),
    ('accessory', 'headphones',   'Наушники',            NULL, 2),
    ('accessory', 'beanie',       'Шапка-бини',          NULL, 3),
    ('accessory', 'gardener_hat', 'Шляпа садовника',     NULL, 4),
    ('accessory', 'wizard_hat',   'Шляпа колдуна',       NULL, 5),
    ('accessory', 'straw_hat',    'Соломенная шляпа',    NULL, 6),
    ('accessory', 'scarf',        'Шарф',                NULL, 7),
    ('accessory', 'glasses',      'Очки',                NULL, 8),
    ('accessory', 'flower',       'Цветок в волосах',    NULL, 9),

    ('bag', 'backpack', 'Рюкзак с клевером', NULL, 1),
    ('bag', 'tote',     'Шоппер',            NULL, 2),
    ('bag', 'none',     'Без сумки',         NULL, 3)
ON CONFLICT (slot_key, key) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;
