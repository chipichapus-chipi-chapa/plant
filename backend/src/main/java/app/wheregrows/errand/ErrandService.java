package app.wheregrows.errand;

import java.time.Clock;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.content.ItemDefinitionRepository;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.exploration.PlayerDiscovery;
import app.wheregrows.exploration.PlayerDiscoveryRepository;
import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;
import app.wheregrows.mentor.PlayerFlag;
import app.wheregrows.mentor.PlayerFlagRepository;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Поручения жителей (мышей, сторожа на тропе). Сначала житель просит (accept), потом игрок отдаёт вещи
 * или показывает находку (complete). Отданное списывается вместе с выдачей награды в одной транзакции;
 * флаг-первичный ключ не даёт выполнить поручение дважды.
 */
@Service
public class ErrandService {

    static final String OFFERED = "errand_offered:";
    static final String DONE = "errand_done:";

    private final GardenMaps maps;
    private final PlayerFlagRepository flags;
    private final PlayerDiscoveryRepository discoveries;
    private final ItemDefinitionRepository items;
    private final Inventory inventory;
    private final PlayerProfileRepository players;
    private final Clock clock;

    ErrandService(GardenMaps maps, PlayerFlagRepository flags, PlayerDiscoveryRepository discoveries,
                  ItemDefinitionRepository items, Inventory inventory, PlayerProfileRepository players, Clock clock) {
        this.maps = maps;
        this.flags = flags;
        this.discoveries = discoveries;
        this.items = items;
        this.inventory = inventory;
        this.players = players;
        this.clock = clock;
    }

    /** Где игрок в каждом поручении: попросили ли его и сделано ли. */
    @Transactional(readOnly = true)
    public List<ErrandState> states(long playerId) {
        Set<String> set = flags.findByIdPlayerId(playerId).stream().map(PlayerFlag::getFlag).collect(Collectors.toSet());
        return maps.errands().stream()
                .map(e -> new ErrandState(e.errand().key(), set.contains(OFFERED + e.errand().key()), set.contains(DONE + e.errand().key())))
                .toList();
    }

    /** Житель попросил — поручение взято. Повторно — ничего не меняет. */
    @Transactional
    public ErrandState accept(long playerId, String key) {
        GardenMap.Errand errand = find(key);
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        setFlag(playerId, OFFERED + errand.key());
        return new ErrandState(errand.key(), true, flags.existsById(new PlayerFlag.Id(playerId, DONE + errand.key())));
    }

    /**
     * Выполнить поручение: отдать вещи (GIVE) или показать находку (SHOW). Всё или ничего:
     * если вещей не хватает, ничего не списано и награды нет.
     */
    @Transactional
    public ErrandResult complete(long playerId, String key) {
        GardenMaps.NpcErrand found = maps.errand(key).orElseThrow(() -> new NotFoundException("Такого поручения нет."));
        GardenMap.Errand errand = found.errand();
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        if (!flags.existsById(new PlayerFlag.Id(playerId, OFFERED + key))) {
            throw new ConflictException(found.npc().name() + " пока ни о чём не просил(а).");
        }
        if (flags.existsById(new PlayerFlag.Id(playerId, DONE + key))) {
            throw new ConflictException("Это поручение уже выполнено.");
        }
        if (errand.kind() == GardenMap.Errand.Kind.SHOW
                && !discoveries.existsById(new PlayerDiscovery.Id(playerId, errand.spot()))) {
            throw new ConflictException("Пока нечего показать.");
        }
        for (ItemGrant give : errand.giveOrEmpty()) {
            String name = items.findById(give.itemKey()).map(i -> i.getName()).orElse(give.itemKey());
            inventory.spend(playerId, give.itemKey(), give.quantity(), name);
        }
        inventory.grant(playerId, errand.rewardOrEmpty());
        setFlag(playerId, DONE + key);
        return new ErrandResult(key, errand.giveOrEmpty(), errand.rewardOrEmpty());
    }

    private GardenMap.Errand find(String key) {
        return maps.errand(key).orElseThrow(() -> new NotFoundException("Такого поручения нет.")).errand();
    }

    private void setFlag(long playerId, String flag) {
        if (!flags.existsById(new PlayerFlag.Id(playerId, flag))) {
            flags.saveAndFlush(new PlayerFlag(playerId, flag, clock.instant()));
        }
    }

    /** offered — житель уже попросил; done — выполнено (сторож ушёл с дороги, награда выдана). */
    public record ErrandState(String key, boolean offered, boolean done) {
    }

    /** Что отдано и что получено. */
    public record ErrandResult(String key, List<ItemGrant> given, List<ItemGrant> reward) {
    }
}
