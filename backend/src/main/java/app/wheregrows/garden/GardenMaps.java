package app.wheregrows.garden;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

/**
 * Загружает все карты локаций при старте (content/gardens/*.json) и проверяет их,
 * включая двери между картами. Домашний сад — карта с ключом {@code home}.
 */
@Component
public class GardenMaps {

    public static final String HOME = "home";
    /** Тип клетки грибницы: такие клетки загораются по одной за день-возвращение. */
    public static final String MYCELIUM = "mycelium";

    private final Map<String, GardenMap> maps = new LinkedHashMap<>();

    GardenMaps(JsonMapper json) throws IOException {
        Resource[] files = new PathMatchingResourcePatternResolver().getResources("classpath:content/gardens/*.json");
        for (Resource file : files) {
            try (InputStream in = file.getInputStream()) {
                GardenMap map = json.readValue(in, GardenMap.class);
                map.validate();
                if (maps.put(map.key(), map) != null) {
                    throw new IllegalStateException("Две карты с ключом " + map.key());
                }
            }
        }
        if (!maps.containsKey(HOME)) {
            throw new IllegalStateException("Нет карты домашнего сада (" + HOME + ")");
        }
        validateDoors();
        validateFog();
        validateGlow();
        validateStory();
    }

    public GardenMap home() {
        return maps.get(HOME);
    }

    /** Локация по ключу или пусто. */
    public Optional<GardenMap> get(String key) {
        return Optional.ofNullable(maps.get(key));
    }

    /** Все локации: сначала домашний сад. */
    public List<GardenMap> all() {
        return maps.values().stream().sorted((a, b) -> a.key().equals(HOME) ? -1 : b.key().equals(HOME) ? 1 : 0).toList();
    }

    /** Постройка с данным ключом на любой карте. Ключи построек уникальны во всём мире. */
    public Optional<GardenMap.Prop> prop(String key) {
        return maps.values().stream().flatMap(m -> m.props().stream()).filter(p -> p.key().equals(key)).findFirst();
    }

    /** Поручение жителя по ключу (на любой карте) — вместе с жителем, который его даёт. */
    public Optional<NpcErrand> errand(String key) {
        return errands().stream().filter(e -> e.errand().key().equals(key)).findFirst();
    }

    public List<NpcErrand> errands() {
        return maps.values().stream().flatMap(m -> m.npcsOrEmpty().stream())
                .filter(n -> n.errand() != null)
                .map(n -> new NpcErrand(n, n.errand()))
                .toList();
    }

    public record NpcErrand(GardenMap.Npc npc, GardenMap.Errand errand) {
    }

    /** Карта, где пекут субботний хлеб, или пусто. */
    public Optional<GardenMap> bakery() {
        return maps.values().stream().filter(m -> m.bread() != null).findFirst();
    }

    /** Субботний хлеб и переезды жителей ссылаются на настоящие поручения и жителей. */
    private void validateStory() {
        for (GardenMap map : maps.values()) {
            for (GardenMap.Npc npc : map.npcsOrEmpty()) {
                map.require(npc.appearsAfter() == null || errand(npc.appearsAfter()).isPresent(),
                        npc.name() + " появляется после несуществующего поручения " + npc.appearsAfter());
                map.require(npc.visitsOn() == null || errand(npc.visitsOn()).isPresent(),
                        npc.name() + " приходит в гости в день несуществующего поручения " + npc.visitsOn());
                map.require(npc.leavesAfter() == null || errand(npc.leavesAfter()).isPresent(),
                        npc.name() + " уходит после несуществующего поручения " + npc.leavesAfter());
            }
            GardenMap.Bread bread = map.bread();
            if (bread == null) {
                continue;
            }
            GardenMap.Npc baker = map.npcsOrEmpty().stream().filter(n -> n.key().equals(bread.npc())).findFirst().orElse(null);
            map.require(baker != null, "хлеб печёт несуществующий житель " + bread.npc());
            map.require(errand(bread.after()).isPresent(), "хлеб ждёт несуществующее поручение " + bread.after());
            map.require(bread.day() != null && bread.base() >= 0, "у хлеба нет дня или размер отрицательный");
            for (String key : List.of("ready", "baked", "waiting")) {
                String talk = bread.talks() == null ? null : bread.talks().get(key);
                map.require(talk != null && baker.dialogues() != null && baker.dialogues().containsKey(talk),
                        "у " + baker.name() + " нет разговора о хлебе «" + key + "»");
            }
        }
    }

    /** Карта с грибницей (Грибная лощина) или пусто. */
    public Optional<GardenMap> glowing() {
        return maps.values().stream().filter(m -> m.glow() != null).findFirst();
    }

    /** Грибница одна; клеток mycelium ровно столько, сколько дней; рассказчик и его разговоры настоящие. */
    private void validateGlow() {
        List<GardenMap> glowing = maps.values().stream().filter(m -> m.glow() != null).toList();
        if (glowing.size() > 1) {
            throw new IllegalStateException("Грибница пока бывает только на одной локации");
        }
        for (GardenMap map : glowing) {
            GardenMap.Glow glow = map.glow();
            map.require(glow.days() > 0 && map.cellsOfType(MYCELIUM).size() == glow.days(),
                    "у грибницы " + glow.days() + " дней, а клеток грибницы " + map.cellsOfType(MYCELIUM).size());
            map.require(errand(glow.after()).isPresent(), "грибница ждёт несуществующее поручение " + glow.after());
            GardenMap.Npc speaker = map.npcsOrEmpty().stream().filter(n -> n.key().equals(glow.speaker())).findFirst().orElse(null);
            map.require(speaker != null, "о грибнице рассказывает несуществующий житель " + glow.speaker());
            map.require(glow.talks() != null && glow.talks().size() == 3, "у грибницы три разговора: тёмная, разгорается, горит");
            glow.talks().forEach(t -> map.require(speaker.dialogues() != null && speaker.dialogues().containsKey(t),
                    "у " + speaker.name() + " нет разговора " + t));
        }
        for (NpcErrand e : errands()) {
            if (e.errand().kind() == GardenMap.Errand.Kind.GLOW && glowing.isEmpty()) {
                throw new IllegalStateException("поручение " + e.errand().key() + " ждёт грибницу, а её нигде нет");
            }
        }
    }

    /** Карта с туманом (Туманное озеро) или пусто. */
    public Optional<GardenMap> foggy() {
        return maps.values().stream().filter(m -> m.fog() != null).findFirst();
    }

    /** Туман ссылается на настоящие поручение, жителя, его разговоры и постройку. */
    private void validateFog() {
        List<GardenMap> foggy = maps.values().stream().filter(m -> m.fog() != null).toList();
        if (foggy.size() > 1) {
            throw new IllegalStateException("Туман пока бывает только над одной локацией");
        }
        for (GardenMap map : foggy) {
            GardenMap.Fog fog = map.fog();
            map.require(fog.days() > 0, "туман рассеивается за " + fog.days() + " дней");
            map.require(errand(fog.after()).isPresent(), "туман ждёт несуществующее поручение " + fog.after());
            GardenMap.Npc speaker = map.npcsOrEmpty().stream().filter(n -> n.key().equals(fog.speaker())).findFirst().orElse(null);
            map.require(speaker != null, "о тумане рассказывает несуществующий житель " + fog.speaker());
            map.require(fog.talks() != null && fog.talks().size() == 3, "у тумана три разговора: густой, редеет, рассеялся");
            fog.talks().forEach(t -> map.require(speaker.dialogues() != null && speaker.dialogues().containsKey(t),
                    "у " + speaker.name() + " нет разговора " + t));
            map.require(fog.notches() == null || map.props().stream().anyMatch(p -> p.key().equals(fog.notches())),
                    "зарубки на несуществующей постройке " + fog.notches());
        }
    }

    /** Двери ведут на существующие карты, в свободную клетку; ключи построек не повторяются между картами. */
    private void validateDoors() {
        for (NpcErrand e : errands()) {
            GardenMap.Errand errand = e.errand();
            if (errand.day() != null && (errand.notToday() == null || e.npc().dialogues() == null
                    || !e.npc().dialogues().containsKey(errand.notToday()))) {
                throw new IllegalStateException("у поручения " + errand.key() + " нет разговора «не сегодня»");
            }
        }
        long errandKeys = errands().stream().map(e -> e.errand().key()).distinct().count();
        if (errandKeys != errands().size()) {
            throw new IllegalStateException("Ключи поручений жителей повторяются");
        }
        long props = maps.values().stream().mapToLong(m -> m.props().size()).sum();
        long distinct = maps.values().stream().flatMap(m -> m.props().stream()).map(GardenMap.Prop::key).distinct().count();
        if (props != distinct) {
            throw new IllegalStateException("Ключи построек повторяются на разных картах");
        }
        for (GardenMap map : maps.values()) {
            for (GardenMap.TileType tile : map.tiles().values()) {
                map.require(tile.revive() == null || prop(tile.revive().when()).isPresent(),
                        "клетка «" + tile.name() + "» оживает от несуществующей постройки");
            }
            for (NpcErrand e : errands()) {
                e.errand().propsOrEmpty().forEach(key -> map.require(prop(key).isPresent(),
                        "поручение " + e.errand().key() + " оживляет несуществующую постройку " + key));
            }
            for (GardenMap.Prop prop : map.props()) {
                GardenMap.Door door = prop.door();
                if (door == null) {
                    continue;
                }
                GardenMap target = maps.get(door.map());
                map.require(target != null, "дверь " + prop.key() + " ведёт на несуществующую карту " + door.map());
                map.require(target.contains(door.x(), door.y()) && target.propAt(door.x(), door.y()) == null,
                        "дверь " + prop.key() + " ведёт в занятую или несуществующую клетку");
                map.require(door.requires() == null || prop(door.requires()).isPresent(),
                        "дверь " + prop.key() + " требует несуществующую постройку " + door.requires());
                map.require(door.requiresErrand() == null || errand(door.requiresErrand()).isPresent(),
                        "дверь " + prop.key() + " требует несуществующее поручение " + door.requiresErrand());
                map.require(!door.waitsForFog() || map.fog() != null,
                        "дверь " + prop.key() + " ждёт тумана, а на карте его нет");
            }
        }
    }
}
