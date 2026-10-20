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
import app.wheregrows.economy.InventoryItemRepository;
import app.wheregrows.player.PlayerProfileRepository;
import app.wheregrows.story.SeasonService;

/**
 * Сад игрока: что где растёт, посадка и прополка. Клетку, наличие семян и инструментов, рост
 * проверяет и считает сервер.
 */
@Service
public class GardenService {

    /** Чем полоть: лопата и грабли с забора. Не тратятся. */
    public static final String WEEDING_TOOLS = "garden_tools";
    static final String OVERGROWN = "overgrown";
    static final String SOIL = "soil";

    private final GardenObjectRepository objects;
    private final GardenMaps maps;
    private final ItemDefinitionRepository items;
    private final PlantSpeciesRepository species;
    private final PlayerProfileRepository players;
    private final Inventory inventory;
    private final InventoryItemRepository inventoryItems;
    private final PlayerTileRepository tiles;
    private final Clock clock;
    private final SeasonService seasons;

    GardenService(GardenObjectRepository objects, GardenMaps maps, ItemDefinitionRepository items,
                  PlantSpeciesRepository species, PlayerProfileRepository players, Inventory inventory,
                  InventoryItemRepository inventoryItems, PlayerTileRepository tiles, Clock clock, SeasonService seasons) {
        this.seasons = seasons;
        this.inventoryItems = inventoryItems;
        this.tiles = tiles;
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
        return objects.findByPlayerIdOrderByGardenKeyAscYAscXAsc(playerId).stream()
                .map(o -> view(o, catalog.get(o.getSpeciesKey()), now))
                .toList();
    }

    /**
     * Сажает семя из сумки в клетку локации (грядки есть не только в домашнем саду). Списание пакетика и появление растения — одна транзакция.
     * Повторная посадка в ту же клетку отклоняется (и уникальный индекс в базе это гарантирует).
     */
    @Transactional
    public GardenObjectView plant(long playerId, String gardenKey, int x, int y, String seedItemKey) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        GardenMap map = maps.get(gardenKey).orElseThrow(() -> new InvalidRequestException("Такой локации нет."));

        if (!map.contains(x, y)) {
            throw new InvalidRequestException("Такой клетки в саду нет.");
        }
        GardenMap.Prop prop = map.propAt(x, y);
        if (prop != null) {
            throw new InvalidRequestException("Здесь стоит «" + prop.name() + "». Сажать можно только на грядку.");
        }
        GardenMap.TileType tile = tileFor(playerId, map, x, y);
        if (!tile.plantable()) {
            throw new InvalidRequestException("«" + tile.name() + "» — не грядка. Сажать можно только на грядку.");
        }
        // зима: земля промёрзла — сажать можно только под теплицей над этой грядкой
        if (seasons.state(playerId).cold() && !seasons.covered(playerId, map.key(), x, y)) {
            throw new ConflictException("Земля промёрзла. Поставьте над грядкой теплицу — и сажайте хоть в снегопад.");
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

    /**
     * Собрать взрослое растение: урожай — в сумку, грядка освобождается. Недозревшее не срывается —
     * сервер сам считает стадию, поэтому поторопить растение с клиента нельзя.
     */
    @Transactional
    public HarvestResult harvest(long playerId, String gardenKey, int x, int y) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        GardenObject object = objects.findByPlayerIdAndGardenKeyAndXAndY(playerId, gardenKey, (short) x, (short) y)
                .orElseThrow(() -> new NotFoundException("Здесь ничего не растёт."));
        PlantSpecies plant = species.findById(object.getSpeciesKey()).orElseThrow();
        if (!PlantGrowth.at(object.getPlantedAt(), plant.getStageMinutes(), clock.instant()).mature()) {
            throw new ConflictException("«" + plant.getName() + "» ещё растёт. Пусть дозреет.");
        }
        if (plant.getProduceKey() == null) {
            throw new ConflictException("«" + plant.getName() + "» не собирают — пусть просто растёт.");
        }
        objects.delete(object);
        objects.flush();
        java.util.List<app.wheregrows.economy.ItemGrant> grants =
                List.of(new app.wheregrows.economy.ItemGrant(plant.getProduceKey(), plant.getProduceQuantity()));
        inventory.grant(playerId, grants);
        return new HarvestResult(gardenKey, x, y, plant.getProduceKey(), plant.getProduceQuantity());
    }

    /** Что собрано и сколько; клетка (x, y) снова свободна. */
    public record HarvestResult(String gardenKey, int x, int y, String itemKey, int quantity) {
    }

    /** Поставить зимой теплицу над грядкой (x, y) локации gardenKey: клетка должна быть грядкой. */
    @Transactional
    public SeasonService.SeasonState buildGreenhouse(long playerId, String gardenKey, int x, int y) {
        GardenMap map = maps.get(gardenKey).orElseThrow(() -> new InvalidRequestException("Такой локации нет."));
        if (!map.contains(x, y) || map.propAt(x, y) != null || !tileFor(playerId, map, x, y).plantable()) {
            throw new InvalidRequestException("Теплицу ставят над грядкой.");
        }
        return seasons.buildGreenhouse(playerId, gardenKey, x, y);
    }

    /** Прополотые клетки домашнего сада: на них заросшая грядка уже стала обычной. */
    @Transactional(readOnly = true)
    public List<Cell> weeded(long playerId) {
        return tiles.findByIdPlayerIdAndIdGardenKey(playerId, maps.home().key()).stream()
                .map(t -> new Cell(t.getX(), t.getY()))
                .sorted(java.util.Comparator.comparingInt(Cell::y).thenComparingInt(Cell::x))
                .toList();
    }

    public record Cell(int x, int y) {
    }

    /**
     * Прополоть заросшую грядку. Нужны лопата и грабли в сумке (они не тратятся).
     * Прополотая клетка становится обычной грядкой — на ней можно сажать.
     */
    @Transactional
    public WeedResult weed(long playerId, int x, int y) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        GardenMap map = maps.home();
        if (!map.contains(x, y)) {
            throw new InvalidRequestException("Такой клетки в саду нет.");
        }
        if (!map.tileAt(x, y).type().equals(OVERGROWN) || map.propAt(x, y) != null) {
            throw new InvalidRequestException("Здесь нечего полоть.");
        }
        if (tiles.existsById(new PlayerTile.Id(playerId, map.key(), (short) x, (short) y))) {
            throw new ConflictException("Эта грядка уже прополота.");
        }
        if (inventoryItems.quantityOf(playerId, WEEDING_TOOLS) < 1) {
            throw new ConflictException("Голыми руками эти сорняки не взять. Лопата и грабли висят на заборе.");
        }
        tiles.saveAndFlush(new PlayerTile(playerId, map.key(), x, y, PlayerTile.WEEDED, clock.instant()));
        int remaining = map.cellsOfType(OVERGROWN).size() - weeded(playerId).size();
        return new WeedResult(x, y, remaining);
    }

    /** Тайл клетки с учётом изменений игрока: прополотая заросшая грядка — уже обычная грядка. */
    private GardenMap.TileType tileFor(long playerId, GardenMap map, int x, int y) {
        GardenMap.TileType tile = map.tileAt(x, y);
        if (tile.type().equals(OVERGROWN) && tiles.existsById(new PlayerTile.Id(playerId, map.key(), (short) x, (short) y))) {
            return map.tiles().values().stream().filter(t -> t.type().equals(SOIL)).findFirst().orElse(tile);
        }
        return tile;
    }

    private static GardenObjectView view(GardenObject object, PlantSpecies plant, Instant now) {
        PlantGrowth growth = PlantGrowth.at(object.getPlantedAt(), plant.getStageMinutes(), now);
        return new GardenObjectView(object.getGardenKey(), object.getX(), object.getY(), object.getKind(), object.getSpeciesKey(),
                object.getPlantedAt(), growth.stage(), growth.stageCount(), growth.mature(), growth.nextStageAt());
    }
}
