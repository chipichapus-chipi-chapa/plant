package app.wheregrows.gift;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.InvalidRequestException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.content.ItemDefinition;
import app.wheregrows.content.ItemDefinitionRepository;
import app.wheregrows.content.ItemKind;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;
import app.wheregrows.mentor.PlayerFlag;
import app.wheregrows.mentor.PlayerFlagRepository;
import app.wheregrows.player.GameCalendar;
import app.wheregrows.player.PlayerProfile;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Подарки жителям: урожай из сумки — одному жителю раз в день (по часовому поясу игрока). Любимый подарок
 * радует особенно и приносит больше Семян жизни, любой другой — тоже благодарность: неправильных подарков нет.
 * <p>
 * Один и тот же житель бывает на разных картах под разными ключами (agata в городке, agata-home дома) —
 * это один человек: ключ до первого дефиса.
 */
@Service
public class GiftService {

    static final String FLAG = "gift:";
    static final int LOVED_SEEDS = 3;
    static final int THANKS_SEEDS = 1;

    private final GardenMaps maps;
    private final ItemDefinitionRepository items;
    private final Inventory inventory;
    private final PlayerProfileRepository players;
    private final PlayerFlagRepository flags;
    private final GameCalendar calendar;
    private final Clock clock;

    GiftService(GardenMaps maps, ItemDefinitionRepository items, Inventory inventory, PlayerProfileRepository players,
                PlayerFlagRepository flags, GameCalendar calendar, Clock clock) {
        this.maps = maps;
        this.items = items;
        this.inventory = inventory;
        this.players = players;
        this.flags = flags;
        this.calendar = calendar;
        this.clock = clock;
    }

    /** Один человек под разными ключами на разных картах: agata и agata-home — оба agata. */
    public static String person(String npcKey) {
        int dash = npcKey.indexOf('-');
        return dash < 0 ? npcKey : npcKey.substring(0, dash);
    }

    @Transactional
    public GiftResult give(long playerId, String npcKey, String itemKey) {
        GardenMap.Npc npc = maps.npc(npcKey).orElseThrow(() -> new NotFoundException("Такого жителя нет."));
        ItemDefinition item = items.findById(itemKey)
                .filter(i -> i.getKind() == ItemKind.PRODUCE)
                .orElseThrow(() -> new InvalidRequestException("Дарят урожай: овощи и цветы со своих грядок."));
        PlayerProfile profile = players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        PlayerFlag.Id today = new PlayerFlag.Id(playerId, flag(npcKey, calendar.today(profile)));
        if (flags.existsById(today)) {
            throw new ConflictException(npc.name() + " уже получил(а) от вас подарок сегодня. Заходите завтра!");
        }
        inventory.spend(playerId, item.getKey(), 1, item.getName());
        boolean loved = npc.gifts() != null && npc.gifts().lovesOrEmpty().contains(itemKey);
        List<ItemGrant> reward = List.of(new ItemGrant(Inventory.LIFE_SEED, loved ? LOVED_SEEDS : THANKS_SEEDS));
        inventory.grant(playerId, reward);
        flags.saveAndFlush(new PlayerFlag(playerId, today.flag(), clock.instant()));
        return new GiftResult(npcKey, itemKey, loved, loved ? npc.gifts().talk() : null, reward);
    }

    /** Кому сегодня уже подарено (ключи людей, см. {@link #person}). */
    @Transactional(readOnly = true)
    public List<String> giftedToday(PlayerProfile profile) {
        String suffix = ":" + calendar.today(profile);
        return flags.findByIdPlayerId(profile.getId()).stream()
                .map(PlayerFlag::getFlag)
                .filter(f -> f.startsWith(FLAG) && f.endsWith(suffix))
                .map(f -> f.substring(FLAG.length(), f.length() - suffix.length()))
                .sorted()
                .toList();
    }

    static String flag(String npcKey, LocalDate day) {
        return FLAG + person(npcKey) + ":" + day;
    }

    /** loved — любимый подарок; talk — разговор, которым житель радуется (только для любимого). */
    public record GiftResult(String npcKey, String itemKey, boolean loved, String talk, List<ItemGrant> reward) {
    }
}
