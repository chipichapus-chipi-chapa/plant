package app.wheregrows.garden;

import java.util.List;
import java.util.Map;

/**
 * Карта локации (сад, сарай изнутри): тайлы задаются строками символов, легенда описывает каждый символ,
 * постройки (props) лежат поверх тайлов. Хранится как контент в resources/content/gardens.
 */
public record GardenMap(String key, String name, int width, int height, Map<String, TileType> tiles,
                        List<String> rows, List<Prop> props, List<Npc> npcs, Fog fog) {

    /** Карта без жителей — для коротких описаний в тестах и простых локаций. */
    public GardenMap(String key, String name, int width, int height, Map<String, TileType> tiles,
                     List<String> rows, List<Prop> props) {
        this(key, name, width, height, tiles, rows, props, List.of(), null);
    }

    /**
     * Туман над локацией (Туманное озеро). Начинается, когда выполнено поручение after (сад поместья ожил),
     * и редеет с каждым днём, в который игрок отметил хоть одну привычку; рассеивается за days таких дней.
     * Пропуски ничего не отнимают — туман просто ждёт.
     *
     * @param speaker житель, который рассказывает о тумане
     * @param talks   его разговоры: [густой, редеет, рассеялся]
     * @param notches постройка, на которой появляются зарубки — по одной за день (причал)
     */
    public record Fog(String after, int days, String speaker, List<String> talks, String notches) {
    }

    public List<Npc> npcsOrEmpty() {
        return npcs == null ? List.of() : npcs;
    }

    /**
     * Тип клетки. revive — во что клетка превращается, когда пробуждена постройка (засохшая клумба
     * оживает, когда в колодце снова есть вода); null — клетка не меняется.
     */
    public record TileType(String type, String name, String description, boolean plantable, Revive revive) {

        public TileType(String type, String name, String description, boolean plantable) {
            this(type, name, description, plantable, null);
        }
    }

    /** tile — символ легенды, в который превращается клетка; when — постройка, которую надо пробудить. */
    public record Revive(String tile, String when) {
    }

    /**
     * Постройка или предмет на карте.
     *
     * @param door дверь в другую локацию (или null)
     * @param read текст, который можно прочитать, — например, письмо (или null)
     */
    public record Prop(String key, String kind, int x, int y, int width, int height, String name,
                       String description, Door door, String read) {
    }

    /**
     * Дверь: на какую карту ведёт, в какую клетку и куда персонаж будет смотреть; label — надпись на кнопке.
     * requires — постройка, которую сначала надо пробудить (калитка, заросшая ежевикой), или null;
 * requiresErrand — поручение, которое надо выполнить; requiresFog — туман на этой карте должен рассеяться (лодка).
     */
    public record Door(String map, int x, int y, String facing, String label, String requires, String requiresErrand,
                       Boolean requiresFog) {

        /** Лодка: плыть можно, когда туман рассеялся. Поле необязательное — у обычных дверей его нет. */
        public boolean waitsForFog() {
            return Boolean.TRUE.equals(requiresFog);
        }
    }

    /**
     * Житель локации (мышь): стоит в клетке, разговаривает; description — что видно, если рассмотреть. Разговоры — тот же граф реплик, что у Вереска,
     * но без наград и флагов: первый разговор — знакомство (talks[0]), дальше — случайный из остальных.
     */
    /** secrets — пасхалки: «слот:вариант» облика игрока → особый разговор. */
    public record Npc(String key, String name, String kind, int x, int y, String description, List<String> talks,
                      Map<String, app.wheregrows.mentor.MentorContent.Dialogue> dialogues, Errand errand,
                      Map<String, String> secrets) {
    }

    /**
     * Поручение жителя. GIVE — отдать вещи (give), SHOW — показать находку (spot обыскан).
     * offer — разговор-просьба, waiting — пока не сделано, thanks — благодарность; reward выдаётся один раз.
     * leaves — житель уходит с дороги, когда поручение выполнено (сторож на тропе).
     */
    public record Errand(String key, Kind kind, String goal, List<app.wheregrows.economy.ItemGrant> give, String spot,
                         List<app.wheregrows.economy.ItemGrant> reward, String offer, String waiting, String thanks,
                         boolean leaves, List<String> props) {

        /** GIVE — отдать вещи, SHOW — показать находку, REVIVE — пробудить все постройки из props. */
        public enum Kind { GIVE, SHOW, REVIVE }

        public List<String> propsOrEmpty() {
            return props == null ? List.of() : props;
        }

        public List<app.wheregrows.economy.ItemGrant> giveOrEmpty() {
            return give == null ? List.of() : give;
        }

        public List<app.wheregrows.economy.ItemGrant> rewardOrEmpty() {
            return reward == null ? List.of() : reward;
        }
    }

    private static final java.util.Set<String> FACINGS = java.util.Set.of("up", "down", "left", "right");

    /** Тип тайла в клетке (x, y). */
    public TileType tileAt(int x, int y) {
        return tiles.get(String.valueOf(rows.get(y).charAt(x)));
    }

    /** Постройка, накрывающая клетку, или null. */
    public Prop propAt(int x, int y) {
        return props.stream()
                .filter(p -> x >= p.x() && y >= p.y() && x < p.x() + p.width() && y < p.y() + p.height())
                .findFirst().orElse(null);
    }

    public boolean contains(int x, int y) {
        return x >= 0 && y >= 0 && x < width && y < height;
    }

    /** Проверка целостности: ошибка в контенте должна ронять запуск, а не всплывать посреди игры. */
    void validate() {
        require(rows.size() == height, "строк карты " + rows.size() + ", а height = " + height);
        for (int y = 0; y < rows.size(); y++) {
            String row = rows.get(y);
            require(row.length() == width, "строка " + y + " длиной " + row.length() + ", а width = " + width);
            for (char c : row.toCharArray()) {
                require(tiles.containsKey(String.valueOf(c)), "символ '" + c + "' в строке " + y + " не описан в tiles");
            }
        }
        for (Prop prop : props) {
            require(contains(prop.x(), prop.y()) && contains(prop.x() + prop.width() - 1, prop.y() + prop.height() - 1),
                    "постройка " + prop.key() + " выходит за край карты");
        }
        require(props.stream().map(Prop::key).distinct().count() == props.size(), "ключи построек повторяются");
        for (Npc npc : npcsOrEmpty()) {
            require(contains(npc.x(), npc.y()) && propAt(npc.x(), npc.y()) == null, "житель " + npc.key() + " стоит вне карты или в постройке");
            require(npc.talks() != null && !npc.talks().isEmpty(), "житель " + npc.key() + " молчит: нет talks");
            npc.talks().forEach(t -> require(npc.dialogues().containsKey(t), "у жителя " + npc.key() + " нет разговора " + t));
            if (npc.secrets() != null) {
                npc.secrets().values().forEach(t -> require(npc.dialogues().containsKey(t), "у жителя " + npc.key() + " нет секретного разговора " + t));
            }
            Errand errand = npc.errand();
            if (errand != null) {
                for (String d : java.util.Arrays.asList(errand.offer(), errand.waiting(), errand.thanks())) {
                    require(d != null && npc.dialogues().containsKey(d), "у поручения " + errand.key() + " нет разговора " + d);
                }
                require(errand.goal() != null, "у поручения " + errand.key() + " нет текста задания");
                require(errand.kind() != Errand.Kind.GIVE || !errand.giveOrEmpty().isEmpty(), "поручение " + errand.key() + ": нечего отдавать");
                require(errand.kind() != Errand.Kind.SHOW || errand.spot() != null, "поручение " + errand.key() + ": нечего показывать");
                require(errand.kind() != Errand.Kind.REVIVE || !errand.propsOrEmpty().isEmpty(), "поручение " + errand.key() + ": нечего оживлять");
            }
            npc.dialogues().forEach((key, dialogue) -> {
                require(dialogue.nodes().containsKey(dialogue.start()), npc.key() + "." + key + ": нет стартовой реплики");
                dialogue.nodes().forEach((id, node) -> {
                    require(node.next() == null || dialogue.nodes().containsKey(node.next()), npc.key() + "." + key + "." + id + ": битый переход");
                    if (node.choices() != null) {
                        node.choices().forEach(c -> require(dialogue.nodes().containsKey(c.next()), npc.key() + "." + key + "." + id + ": ответ ведёт в никуда"));
                    }
                });
            });
        }
        for (TileType tile : tiles.values()) {
            if (tile.revive() != null) {
                require(tiles.containsKey(tile.revive().tile()), "клетка «" + tile.name() + "» оживает в неизвестный символ " + tile.revive().tile());
            }
        }
        for (Prop prop : props) {
            if (prop.door() != null) {
                require(FACINGS.contains(prop.door().facing()), "у двери " + prop.key() + " неизвестное направление " + prop.door().facing());
                require(prop.door().label() != null, "у двери " + prop.key() + " нет надписи на кнопке");
            }
        }
    }

    /** Клетки, где лежит тайл данного типа (например, все заросшие грядки). */
    public java.util.List<int[]> cellsOfType(String type) {
        java.util.List<int[]> cells = new java.util.ArrayList<>();
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if (tileAt(x, y).type().equals(type)) {
                    cells.add(new int[] {x, y});
                }
            }
        }
        return cells;
    }

    void require(boolean condition, String problem) {
        if (!condition) {
            throw new IllegalStateException("Карта сада «" + key + "»: " + problem);
        }
    }
}
