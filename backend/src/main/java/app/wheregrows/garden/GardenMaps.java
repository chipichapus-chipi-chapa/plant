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
    }

    public GardenMap home() {
        return maps.get(HOME);
    }

    /** Все локации: сначала домашний сад. */
    public List<GardenMap> all() {
        return maps.values().stream().sorted((a, b) -> a.key().equals(HOME) ? -1 : b.key().equals(HOME) ? 1 : 0).toList();
    }

    /** Постройка с данным ключом на любой карте. Ключи построек уникальны во всём мире. */
    public Optional<GardenMap.Prop> prop(String key) {
        return maps.values().stream().flatMap(m -> m.props().stream()).filter(p -> p.key().equals(key)).findFirst();
    }

    /** Двери ведут на существующие карты, в свободную клетку; ключи построек не повторяются между картами. */
    private void validateDoors() {
        long props = maps.values().stream().mapToLong(m -> m.props().size()).sum();
        long distinct = maps.values().stream().flatMap(m -> m.props().stream()).map(GardenMap.Prop::key).distinct().count();
        if (props != distinct) {
            throw new IllegalStateException("Ключи построек повторяются на разных картах");
        }
        for (GardenMap map : maps.values()) {
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
            }
        }
    }
}
