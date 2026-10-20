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
import app.wheregrows.magic.MagicService;
import app.wheregrows.mentor.PlayerFlag;
import app.wheregrows.mentor.PlayerFlagRepository;
import app.wheregrows.player.PlayerProfileRepository;
import app.wheregrows.story.BeaconService;
import app.wheregrows.story.GlowService;

/**
 * Поручения жителей (мышей, сторожа на тропе). Сначала житель просит (accept), потом игрок отдаёт вещи
 * или показывает находку (complete). Отданное списывается вместе с выдачей награды в одной транзакции;
 * флаг-первичный ключ не даёт выполнить поручение дважды.
 */
@Service
public class ErrandService {

    static final String OFFERED = "errand_offered:";
    public static final String DONE = "errand_done:";

    private final GardenMaps maps;
    private final PlayerFlagRepository flags;
    private final PlayerDiscoveryRepository discoveries;
    private final ItemDefinitionRepository items;
    private final Inventory inventory;
    private final PlayerProfileRepository players;
    private final MagicService magic;
    private final Clock clock;
    private final GlowService glow;
    private final BeaconService beacon;

    ErrandService(GardenMaps maps, PlayerFlagRepository flags, PlayerDiscoveryRepository discoveries,
                  ItemDefinitionRepository items, Inventory inventory, PlayerProfileRepository players,
                  MagicService magic, Clock clock, GlowService glow, BeaconService beacon) {
        this.glow = glow;
        this.beacon = beacon;
        this.magic = magic;
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
        if (errand.kind() == GardenMap.Errand.Kind.REVIVE) {
            List<String> sleeping = errand.propsOrEmpty().stream().filter(p -> !magic.isAwakened(playerId, p))
                    .map(p -> maps.prop(p).map(GardenMap.Prop::name).orElse(p)).toList();
            if (!sleeping.isEmpty()) {
                throw new ConflictException("Ещё спят: " + String.join(", ", sleeping) + ".");
            }
        }
        if (errand.kind() == GardenMap.Errand.Kind.GLOW
                && !glow.state(playerId).map(GlowService.GlowState::lit).orElse(false)) {
            throw new ConflictException("Грибница ещё не разгорелась.");
        }
        if (errand.kind() == GardenMap.Errand.Kind.BEACON
                && !beacon.state(playerId).map(BeaconService.BeaconState::enough).orElse(false)) {
            throw new ConflictException("В маяке горит слишком мало окон.");
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
