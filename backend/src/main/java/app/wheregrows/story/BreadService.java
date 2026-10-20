package app.wheregrows.story;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.errand.ErrandService;
import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Субботний хлеб — награда за неделю, а не за день. Когда Агата дома и печь разожжена, в субботу она печёт
 * каравай: тем больше, чем больше дней этой недели (с понедельника) вы отмечали привычки. Один раз в неделю —
 * это держит флаг {@code bread:<год>-W<неделя>}. Пропущенная суббота ничего не отнимает: просто на этой неделе
 * каравая не было, следующая начнётся заново.
 */
@Service
public class BreadService {

    static final String BAKED = "bread:";
    /** Флаг кнопки тестирования «Сегодня суббота»: хлеб можно испечь в любой день. */
    public static final String TEST_DAY = "test_bread_day";

    private final GardenMaps maps;
    private final JdbcClient db;
    private final Inventory inventory;
    private final PlayerProfileRepository players;
    private final Clock clock;

    BreadService(GardenMaps maps, JdbcClient db, Inventory inventory, PlayerProfileRepository players, Clock clock) {
        this.maps = maps;
        this.db = db;
        this.inventory = inventory;
        this.players = players;
        this.clock = clock;
    }

    /**
     * @param home      пекарь дома, печь горит — хлеб вообще бывает
     * @param today     сегодня день хлеба (или тестировщик сказал «сегодня суббота»)
     * @param baked     на этой неделе каравай уже испечён
     * @param days      сколько дней этой недели отмечены привычки
     * @param loaf      сколько Семян жизни будет в каравае, если испечь сейчас
     */
    public record BreadState(boolean home, boolean today, boolean baked, int days, int loaf) {

        public boolean ready() {
            return home && today && !baked;
        }
    }

    @Transactional(readOnly = true)
    public Optional<BreadState> state(long playerId) {
        return maps.bakery().map(map -> state(playerId, map.bread()));
    }

    /** Испечь каравай: Семена жизни по числу дней недели с привычками. Второй раз за неделю — нельзя. */
    @Transactional
    public BreadResult bake(long playerId) {
        GardenMap.Bread bread = maps.bakery().map(GardenMap::bread)
                .orElseThrow(() -> new NotFoundException("Хлеба в этой игре не пекут."));
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        BreadState state = state(playerId, bread);
        if (!state.home()) {
            throw new ConflictException("Печь ещё холодная.");
        }
        if (state.baked()) {
            throw new ConflictException("Каравай на этой неделе уже испечён — следующий в субботу.");
        }
        if (!state.today()) {
            throw new ConflictException("Хлеб пекут по субботам.");
        }
        db.sql("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, ?, ?)")
                .params(playerId, BAKED + week(today(playerId)), Timestamp.from(clock.instant()))
                .update();
        List<ItemGrant> reward = List.of(new ItemGrant(Inventory.LIFE_SEED, state.loaf()));
        inventory.grant(playerId, reward);
        return new BreadResult(state.days(), reward);
    }

    /** days — сколько дней недели вошло в каравай. */
    public record BreadResult(int days, List<ItemGrant> reward) {
    }

    private BreadState state(long playerId, GardenMap.Bread bread) {
        LocalDate today = today(playerId);
        boolean home = flag(playerId, ErrandService.DONE + bread.after());
        boolean breadDay = today.getDayOfWeek() == bread.day() || flag(playerId, TEST_DAY);
        boolean baked = flag(playerId, BAKED + week(today));
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        int days = db.sql("SELECT count(DISTINCT completed_on) FROM habit_completion WHERE player_id = ? AND completed_on BETWEEN ? AND ?")
                .params(playerId, monday, today)
                .query(Long.class).single().intValue();
        return new BreadState(home, breadDay, baked, days, bread.base() + days);
    }

    private LocalDate today(long playerId) {
        ZoneId zone = ZoneId.of(db.sql("SELECT timezone FROM player_profile WHERE user_id = ?")
                .param(playerId).query(String.class).single());
        return LocalDate.now(clock.withZone(zone));
    }

    private static String week(LocalDate day) {
        return day.get(IsoFields.WEEK_BASED_YEAR) + "-W" + day.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
    }

    private boolean flag(long playerId, String flag) {
        return db.sql("SELECT count(*) FROM player_flag WHERE player_id = ? AND flag = ?")
                .params(playerId, flag).query(Long.class).single() > 0;
    }
}
