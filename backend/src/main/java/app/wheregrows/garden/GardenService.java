package app.wheregrows.garden;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.InvalidRequestException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.content.ItemDefinition;
import app.wheregrows.content.ItemDefinitionRepository;
import app.wheregrows.content.ItemKind;
import app.wheregrows.content.PlantSpecies;
import app.wheregrows.content.PlantSpeciesRepository;
import app.wheregrows.economy.Inventory;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Сад игрока: что где растёт и посадка. Клетку, наличие семян и рост проверяет и считает сервер.
 */
@Service
public class GardenService {

    private final GardenObjectRepository objects;
    private final GardenMaps maps;
    private final ItemDefinitionRepository items;
    private final PlantSpeciesRepository species;
    private final PlayerProfileRepository players;
    private final Inventory inventory;
    private final Clock clock;

    GardenService(GardenObjectRepository objects, GardenMaps maps, ItemDefinitionRepository items,
                  PlantSpeciesRepository species, PlayerProfileRepository players, Inventory inventory, Clock clock) {
        this.objects = objects;
        this.maps = maps;
        this.items = items;
        this.species = species;
        this.players = players;
        this.inventory = inventory;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<GardenObjectView> objects(long playerId) {
        Map<String, PlantSpecies> catalog = species.findAll().stream()
                .collect(Collectors.toMap(PlantSpecies::getKey, Function.identity()));
        Instant now = clock.instant();
        return objects.findByPlayerIdAndGardenKeyOrderByYAscXAsc(playerId, maps.home().key()).stream()
                .map(o -> view(o, catalog.get(o.getSpeciesKey()), now))
                .toList();
    }

    /**
     * Сажает семя из сумки в клетку. Списание пакетика и появление растения — одна транзакция.
     * Повторная посадка в ту же клетку отклоняется (и уникальный индекс в базе это гарантирует).
     */
    @Transactional
    public GardenObjectView plant(long playerId, int x, int y, String seedItemKey) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        GardenMap map = maps.home();

        if (!map.contains(x, y)) {
            throw new InvalidRequestException("Такой клетки в саду нет.");
        }
        GardenMap.Prop prop = map.propAt(x, y);
        if (prop != null) {
            throw new InvalidRequestException("Здесь стоит «" + prop.name() + "». Сажать можно только на грядку.");
        }
        GardenMap.TileType tile = map.tileAt(x, y);
        if (!tile.plantable()) {
            throw new InvalidRequestException("«" + tile.name() + "» — не грядка. Сажать можно только на грядку.");
        }
        if (objects.existsByPlayerIdAndGardenKeyAndXAndY(playerId, map.key(), (short) x, (short) y)) {
            throw new ConflictException("На этой грядке уже что-то растёт.");
        }

        ItemDefinition seed = items.findById(seedItemKey)
                .filter(item -> item.getKind() == ItemKind.SEED)
                .orElseThrow(() -> new InvalidRequestException("Это нельзя посадить."));
        PlantSpecies plant = species.findById(seed.getSpeciesKey()).orElseThrow();

        inventory.spend(playerId, seed.getKey(), 1, seed.getName());
        Instant now = clock.instant();
        GardenObject planted = objects.saveAndFlush(
                GardenObject.plant(playerId, map.key(), x, y, plant.getKey(), now));
        return view(planted, plant, now);
    }

    private static GardenObjectView view(GardenObject object, PlantSpecies plant, Instant now) {
        PlantGrowth growth = PlantGrowth.at(object.getPlantedAt(), plant.getStageMinutes(), now);
        return new GardenObjectView(object.getX(), object.getY(), object.getKind(), object.getSpeciesKey(),
                object.getPlantedAt(), growth.stage(), growth.stageCount(), growth.mature(), growth.nextStageAt());
    }
}
