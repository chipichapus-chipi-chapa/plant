package app.wheregrows.errand;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
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
import app.wheregrows.player.GameCalendar;
import app.wheregrows.player.PlayerProfile;
import app.wheregrows.player.PlayerProfileRepository;
import app.wheregrows.story.GlowService;

/**
 * Поручения жителей (мышей, сторожа на тропе). Сначала житель просит (accept), потом игрок отдаёт вещи
 * или показывает находку (complete). Отданное списывается вместе с выдачей награды в одной транзакции;
 * флаг-первичный ключ не даёт выполнить поручение дважды.
 */
@Service
public class ErrandService {

    static final String OFFERED = "errand_offered:";
    /** Флаг кнопки тестирования «Сегодня пятница»: поручения с днём недели можно выполнить в любой день. */
    public static final String TEST_DAY = "test_errand_day";
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
    private final GameCalendar calendar;

    ErrandService(GardenMaps maps, PlayerFlagRepository flags, PlayerDiscoveryRepository discoveries,
                  ItemDefinitionRepository items, Inventory inventory, PlayerProfileRepository players,
                  MagicService magic, Clock clock, GlowService glow, GameCalendar calendar) {
        this.glow = glow;
        this.calendar = calendar;
        this.magic = magic;
        this.maps = maps;
        this.flags = flags;
        this.discoveries = discoveries;
        this.items = items;
        this.inventory = inventory;
        this.players = players;
        this.clock = clock;
    }

    /** Где игрок в каждом поручении: попросили ли его, сделано ли (и в какой день), подходит ли сегодняшний день. */
    @Transactional(readOnly = true)
    public List<ErrandState> states(long playerId) {
        PlayerProfile profile = players.findById(playerId).orElseThrow();
        java.util.Map<String, java.time.Instant> set = flags.findByIdPlayerId(playerId).stream()
                .collect(Collectors.toMap(PlayerFlag::getFlag, PlayerFlag::getSetAt));
        LocalDate today = calendar.today(profile);
        boolean testDay = set.containsKey(TEST_DAY);
        return maps.errands().stream()
                .map(e -> {
                    java.time.Instant done = set.get(DONE + e.errand().key());
                    return new ErrandState(e.errand().key(), set.containsKey(OFFERED + e.errand().key()), done != null,
                            done == null ? null : done.atZone(profile.getZone()).toLocalDate(),
                            e.errand().day() == null || testDay || today.getDayOfWeek() == e.errand().day());
                })
                .toList();
    }

    /** Житель попросил — поручение взято. Повторно — ничего не меняет. */
    @Transactional
    public ErrandState accept(long playerId, String key) {
        GardenMap.Errand errand = find(key);
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        setFlag(playerId, OFFERED + errand.key());
        return states(playerId).stream().filter(st -> st.key().equals(errand.key())).findFirst().orElseThrow();
    }

    /**
     * Выполнить поручение: отдать вещи (GIVE) или показать находку (SHOW). Всё или ничего:
     * если вещей не хватает, ничего не списано и награды нет.
     */
    @Transactional
    public ErrandResult complete(long playerId, String key) {
        GardenMaps.NpcErrand found = maps.errand(key).orElseThrow(() -> new NotFoundException("Такого поручения нет."));
        GardenMap.Errand errand = found.errand();
        PlayerProfile profile = players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
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
        if (errand.day() != null && calendar.today(profile).getDayOfWeek() != errand.day()
                && !flags.existsById(new PlayerFlag.Id(playerId, TEST_DAY))) {
            throw new ConflictException("Не сегодня: " + found.npc().name() + " ждёт подходящего дня.");
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

    /**
     * offered — житель уже попросил; done — выполнено (сторож ушёл с дороги, награда выдана); doneOn — в какой
     * день по часам игрока; today — сегодня подходящий день (у поручений без дня недели — всегда).
     */
    public record ErrandState(String key, boolean offered, boolean done, LocalDate doneOn, boolean today) {
    }

    /** Что отдано и что получено. */
    public record ErrandResult(String key, List<ItemGrant> given, List<ItemGrant> reward) {
    }
}
