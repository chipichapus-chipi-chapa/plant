package app.wheregrows.habit;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.InvalidRequestException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.config.GameProperties;
import app.wheregrows.content.CrystalCategoryRepository;
import app.wheregrows.content.ItemDefinitionRepository;
import app.wheregrows.content.ItemKind;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.player.GameCalendar;
import app.wheregrows.player.PlayerProfile;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Привычки и их отметки.
 *
 * <p>Каждая изменяющая операция начинается с блокировки строки профиля игрока ({@code lockPlayer}).
 * Поэтому действия одного игрока выполняются по очереди: две одновременные отметки не могут
 * обе решить, что «сегодня ещё не отмечено», а дневной лимит наград считается без гонок.
 * Уникальный индекс (habit_id, completed_on) в базе остаётся последней линией защиты.
 */
@Service
public class HabitService {

    private final HabitRepository habits;
    private final HabitCompletionRepository completions;
    private final PlayerProfileRepository players;
    private final CrystalCategoryRepository crystals;
    private final ItemDefinitionRepository items;
    private final Inventory inventory;
    private final GameCalendar calendar;
    private final GameProperties.Rewards rewards;
    private final GameProperties.Habits limits;
    private final Clock clock;

    HabitService(HabitRepository habits, HabitCompletionRepository completions, PlayerProfileRepository players,
                 CrystalCategoryRepository crystals, ItemDefinitionRepository items, Inventory inventory,
                 GameCalendar calendar, GameProperties properties, Clock clock) {
        this.habits = habits;
        this.completions = completions;
        this.players = players;
        this.crystals = crystals;
        this.items = items;
        this.inventory = inventory;
        this.calendar = calendar;
        this.rewards = properties.rewards();
        this.limits = properties.habits();
        this.clock = clock;
    }

    /** Активные привычки игрока с отметкой «сделано сегодня». */
    @Transactional(readOnly = true)
    public List<HabitView> list(PlayerProfile player) {
        Set<Long> doneToday = completions.findByPlayerIdAndCompletedOn(player.getId(), calendar.today(player)).stream()
                .map(HabitCompletion::getHabitId)
                .collect(Collectors.toSet());
        return habits.findByPlayerIdAndArchivedAtIsNullOrderByIdAsc(player.getId()).stream()
                .map(h -> HabitView.of(h, doneToday.contains(h.getId())))
                .toList();
    }

    /** Сколько наград за отметки игрок уже получил сегодня и каков лимит. */
    @Transactional(readOnly = true)
    public DailyRewards dailyRewards(PlayerProfile player) {
        return new DailyRewards((int) completions.countRewarded(player.getId(), calendar.today(player)),
                rewards.dailyRewardedCompletions());
    }

    public record DailyRewards(int used, int limit) {
    }

    @Transactional
    public HabitView create(long playerId, String rawTitle, String crystalCategory) {
        lockPlayer(playerId);
        String title = normalizeTitle(rawTitle);
        requireKnownCategory(crystalCategory);
        if (habits.countByPlayerIdAndArchivedAtIsNull(playerId) >= limits.maxActive()) {
            throw new ConflictException("Привычек уже " + limits.maxActive()
                    + ". Уберите какую-нибудь в архив, чтобы освободить место.");
        }
        if (habits.existsByPlayerIdAndTitleIgnoreCaseAndArchivedAtIsNull(playerId, title)) {
            throw new ConflictException("Привычка «" + title + "» уже есть.");
        }
        return HabitView.of(habits.save(new Habit(playerId, title, crystalCategory)), false);
    }

    @Transactional
    public HabitView update(long playerId, long habitId, String rawTitle, String crystalCategory) {
        PlayerProfile player = lockPlayer(playerId);
        Habit habit = findActive(playerId, habitId);
        String title = normalizeTitle(rawTitle);
        requireKnownCategory(crystalCategory);
        if (habits.existsByPlayerIdAndTitleIgnoreCaseAndArchivedAtIsNullAndIdNot(playerId, title, habitId)) {
            throw new ConflictException("Привычка «" + title + "» уже есть.");
        }
        habit.update(title, crystalCategory);
        boolean doneToday = completions.findByHabitIdAndCompletedOn(habitId, calendar.today(player)).isPresent();
        return HabitView.of(habit, doneToday);
    }

    /** Убирает привычку в архив. Отметки и полученные награды остаются у игрока. */
    @Transactional
    public void archive(long playerId, long habitId) {
        lockPlayer(playerId);
        findActive(playerId, habitId).archive(clock.instant());
    }

    /**
     * Отмечает привычку выполненной сегодня. Идемпотентно: повторный вызов в тот же день
     * ничего не меняет и сообщает, что отметка уже была.
     */
    @Transactional
    public CompletionResult completeToday(long playerId, long habitId) {
        PlayerProfile player = lockPlayer(playerId);
        Habit habit = findActive(playerId, habitId);
        LocalDate today = calendar.today(player);

        if (completions.findByHabitIdAndCompletedOn(habitId, today).isPresent()) {
            return CompletionResult.alreadyDone(habitId, today);
        }

        boolean withinDailyLimit = completions.countRewarded(playerId, today) < rewards.dailyRewardedCompletions();
        List<ItemGrant> reward = withinDailyLimit ? rewardFor(habit) : List.of();

        int lifeSeeds = reward.stream().filter(g -> g.itemKey().equals(Inventory.LIFE_SEED))
                .mapToInt(ItemGrant::quantity).sum();
        String shardKey = reward.stream().map(ItemGrant::itemKey)
                .filter(key -> !key.equals(Inventory.LIFE_SEED)).findFirst().orElse(null);

        completions.saveAndFlush(new HabitCompletion(habitId, playerId, today, lifeSeeds, shardKey));
        inventory.grant(playerId, reward);
        return CompletionResult.completed(habitId, today, reward, withinDailyLimit);
    }

    /**
     * Отметка за конкретный день. Сегодня — обычная отметка с наградой.
     * Прошлые дни — запись в дневнике без награды: так можно вести честную историю,
     * но нельзя «дозаполнить» месяц ради ресурсов.
     */
    @Transactional
    public CompletionResult completeOn(long playerId, long habitId, LocalDate day) {
        PlayerProfile player = lockPlayer(playerId);
        LocalDate today = calendar.today(player);
        if (day.equals(today)) {
            return completeToday(playerId, habitId);
        }
        requireEditablePastDay(day, today);
        findActive(playerId, habitId);
        if (completions.findByHabitIdAndCompletedOn(habitId, day).isPresent()) {
            return CompletionResult.alreadyDone(habitId, day);
        }
        completions.saveAndFlush(new HabitCompletion(habitId, playerId, day, 0, null));
        return CompletionResult.recorded(habitId, day);
    }

    /** Снять отметку с прошлого дня. Сегодняшняя отметка остаётся: награда за неё уже в сумке. */
    @Transactional
    public void uncomplete(long playerId, long habitId, LocalDate day) {
        PlayerProfile player = lockPlayer(playerId);
        LocalDate today = calendar.today(player);
        if (!day.isBefore(today)) {
            throw new ConflictException("Сегодняшняя отметка остаётся: награда за неё уже в сумке.");
        }
        requireEditablePastDay(day, today);
        findActive(playerId, habitId);
        completions.findByHabitIdAndCompletedOn(habitId, day).ifPresent(completions::delete);
    }

    public LocalDate today(PlayerProfile player) {
        return calendar.today(player);
    }

    /** Отметки активных привычек за месяц — для трекера. */
    @Transactional(readOnly = true)
    public HabitHistory history(PlayerProfile player, YearMonth month) {
        LocalDate today = calendar.today(player);
        List<Habit> active = habits.findByPlayerIdAndArchivedAtIsNullOrderByIdAsc(player.getId());
        Map<Long, List<Integer>> days = completions
                .findByPlayerIdAndCompletedOnBetweenOrderByCompletedOn(player.getId(), month.atDay(1), month.atEndOfMonth())
                .stream()
                .collect(Collectors.groupingBy(HabitCompletion::getHabitId,
                        Collectors.mapping(c -> c.getCompletedOn().getDayOfMonth(), Collectors.toList())));
        return new HabitHistory(month.toString(), month.lengthOfMonth(), today,
                today.minusDays(limits.historyDays()),
                active.stream()
                        .map(h -> new HabitHistory.Row(h.getId(), h.getTitle(), h.getCrystalCategory(),
                                days.getOrDefault(h.getId(), List.of())))
                        .toList());
    }

    private void requireEditablePastDay(LocalDate day, LocalDate today) {
        if (day.isAfter(today)) {
            throw new InvalidRequestException("Этот день ещё не наступил.");
        }
        if (day.isBefore(today.minusDays(limits.historyDays()))) {
            throw new InvalidRequestException("Так далеко дневник не листается: отмечать можно последние "
                    + limits.historyDays() + " дней.");
        }
    }

    private List<ItemGrant> rewardFor(Habit habit) {
        List<ItemGrant> reward = new ArrayList<>();
        if (rewards.lifeSeedsPerCompletion() > 0) {
            reward.add(new ItemGrant(Inventory.LIFE_SEED, rewards.lifeSeedsPerCompletion()));
        }
        if (habit.getCrystalCategory() != null && rewards.shardsPerCompletion() > 0) {
            String shardKey = items.findByKindAndCrystalCategory(ItemKind.SHARD, habit.getCrystalCategory())
                    .orElseThrow(() -> new IllegalStateException(
                            "В каталоге нет осколка категории " + habit.getCrystalCategory()))
                    .getKey();
            reward.add(new ItemGrant(shardKey, rewards.shardsPerCompletion()));
        }
        return reward;
    }

    private PlayerProfile lockPlayer(long playerId) {
        return players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
    }

    private Habit findActive(long playerId, long habitId) {
        return habits.findByIdAndPlayerIdAndArchivedAtIsNull(habitId, playerId)
                .orElseThrow(() -> new NotFoundException("Такой привычки нет — возможно, она уже в архиве."));
    }

    private void requireKnownCategory(String crystalCategory) {
        if (crystalCategory != null && !crystals.existsById(crystalCategory)) {
            throw new InvalidRequestException("Неизвестная категория кристалла: " + crystalCategory + ".");
        }
    }

    /** Обрезает пробелы по краям и схлопывает повторяющиеся внутри. */
    static String normalizeTitle(String title) {
        return title.strip().replaceAll("\\s+", " ");
    }
}
