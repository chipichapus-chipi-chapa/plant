package app.wheregrows.story;

import java.time.LocalDate;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.player.ValleyCalendar;
import app.wheregrows.player.PlayerProfile;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Времена года в саду идут быстрее настоящих: каждое длится неделю (с понедельника по часам игрока) —
 * весна, лето, осень, зима и снова весна. Зимой холодно: земля промерзает, и сажать можно только
 * в теплице у дома. Теплицу строят на одну зиму — весной её разбирают, следующей зимой строят снова.
 * Посаженное раньше растёт дальше: холод ничего не отнимает.
 */
@Service
public class SeasonService {

    static final String GREENHOUSE = "greenhouse:";
    /** Сколько стоит теплица: Семена жизни и янтарь — кристалл заботы о доме. */
    public static final List<ItemGrant> GREENHOUSE_COST = List.of(new ItemGrant(Inventory.LIFE_SEED, 20), new ItemGrant("shard_amber", 1));

    public enum Season { WINTER, SPRING, SUMMER, AUTUMN }

    private final ValleyCalendar calendar;
    private final PlayerProfileRepository players;
    private final Inventory inventory;
    private final JdbcClient db;
    private final java.time.Clock clock;

    SeasonService(ValleyCalendar calendar, PlayerProfileRepository players, Inventory inventory, JdbcClient db, java.time.Clock clock) {
        this.calendar = calendar;
        this.players = players;
        this.inventory = inventory;
        this.db = db;
        this.clock = clock;
    }

    /** Отсчёт недель: с этого понедельника; сдвиг подобран так, чтобы неделя 19 октября 2026 была осенью. */
    static final LocalDate EPOCH = LocalDate.of(2026, 1, 5);
    static final int SHIFT = 1;
    static final Season[] ORDER = {Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER};

    /** Понедельник недели, в которую попал день. */
    static LocalDate monday(LocalDate day) {
        return day.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
    }

    public static Season seasonOf(LocalDate day) {
        long weeks = java.time.temporal.ChronoUnit.WEEKS.between(EPOCH, monday(day));
        return ORDER[(int) Math.floorMod(weeks + SHIFT, ORDER.length)];
    }

    /** Холодно — зимой. */
    static boolean cold(LocalDate day) {
        return seasonOf(day) == Season.WINTER;
    }

    /** Теплица строится на одну зиму — её неделя и есть ключ. */
    static String coldKey(LocalDate day) {
        return monday(day).toString();
    }

    @Transactional(readOnly = true)
    public SeasonState state(PlayerProfile profile) {
        LocalDate today = calendar.today(profile);
        Season season = seasonOf(today);
        boolean cold = cold(today);
        boolean greenhouse = cold && has(profile.getId(), GREENHOUSE + coldKey(today));
        return new SeasonState(season, cold, greenhouse);
    }

    /** Построить теплицу на эту холодную пору. Летом не нужна, дважды за зиму — не строится. */
    @Transactional
    public SeasonState buildGreenhouse(long playerId) {
        PlayerProfile profile = players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        SeasonState state = state(profile);
        if (!state.cold()) {
            throw new ConflictException("Сейчас тепло — грядкам теплица не нужна.");
        }
        if (state.greenhouse()) {
            throw new ConflictException("Теплица уже стоит.");
        }
        for (ItemGrant cost : GREENHOUSE_COST) {
            inventory.spend(playerId, cost.itemKey(), cost.quantity(),
                    cost.itemKey().equals(Inventory.LIFE_SEED) ? "Семена жизни" : "Осколок янтаря");
        }
        db.sql("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, ?, ?)")
                .params(playerId, GREENHOUSE + coldKey(calendar.today(profile)), java.sql.Timestamp.from(clock.instant()))
                .update();
        return state(profile);
    }

    private boolean has(long playerId, String flag) {
        return db.sql("SELECT count(*) FROM player_flag WHERE player_id = ? AND flag = ?")
                .params(playerId, flag).query(Long.class).single() > 0;
    }

    /** season — время года; cold — земля промёрзла (зима); greenhouse — теплица у дома стоит. */
    public record SeasonState(Season season, boolean cold, boolean greenhouse) {
    }
}
