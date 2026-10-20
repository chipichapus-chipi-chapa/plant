package app.wheregrows.story;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.economy.Inventory;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Времена года в долине идут условно быстро: каждое длится полчаса — весна, лето, осень, зима и снова весна.
 * У каждого игрока есть часы долины: ими время года можно перевести вперёд или назад (флаг season_shift:N).
 * Зимой холодно: земля промерзает, и сажать можно только под теплицей — стеклянный домик ставят над всей грядкой
 * (связным участком), каждой — свой, на одну зиму: весной теплицы разбирают, следующей зимой ставят снова. Посаженное раньше растёт дальше:
 * холод ничего не отнимает.
 * Дни недели часы тоже крутят ({@link app.wheregrows.player.ValleyCalendar}); привычки и награды за них живут
 * по настоящему календарю.
 */
@Service
public class SeasonService {

    /** Сколько длится одно время года. */
    public static final Duration LENGTH = Duration.ofMinutes(30);
    static final String SHIFT = "season_shift:";
    static final String GREENHOUSE = "greenhouse:";
    /** Сколько стоит теплица над одной грядкой (участком). */
    public static final int GREENHOUSE_COST = 10;

    public enum Season { SPRING, SUMMER, AUTUMN, WINTER }

    private final PlayerProfileRepository players;
    private final Inventory inventory;
    private final JdbcClient db;
    private final Clock clock;

    SeasonService(PlayerProfileRepository players, Inventory inventory, JdbcClient db, Clock clock) {
        this.players = players;
        this.inventory = inventory;
        this.db = db;
        this.clock = clock;
    }

    /** Номер получасового отрезка с начала эпохи — с учётом часов игрока. Каждый отрезок — своё время года. */
    long slot(long playerId) {
        return clock.instant().getEpochSecond() / LENGTH.toSeconds() + shift(playerId);
    }

    static Season seasonOf(long slot) {
        return Season.values()[(int) Math.floorMod(slot, Season.values().length)];
    }

    @Transactional(readOnly = true)
    public SeasonState state(long playerId) {
        long slot = slot(playerId);
        Season season = seasonOf(slot);
        boolean cold = season == Season.WINTER;
        List<Cell> greenhouses = !cold ? List.of() : db.sql("SELECT flag FROM player_flag WHERE player_id = ? AND flag LIKE ?")
                .params(playerId, GREENHOUSE + slot + ":%").query(String.class).list().stream()
                .map(f -> f.substring((GREENHOUSE + slot + ":").length()).split(":"))
                .map(p -> new Cell(p[0], Integer.parseInt(p[1]), Integer.parseInt(p[2])))
                .sorted(java.util.Comparator.comparing(Cell::gardenKey).thenComparingInt(Cell::y).thenComparingInt(Cell::x))
                .toList();
        Instant endsAt = Instant.ofEpochSecond((clock.instant().getEpochSecond() / LENGTH.toSeconds() + 1) * LENGTH.toSeconds());
        return new SeasonState(season, cold, greenhouses, endsAt, shift(playerId) != 0);
    }

    /** Перевести часы долины на seasons времён года (минус — назад); reset — вернуть как было. */
    @Transactional
    public SeasonState wind(long playerId, int seasons, boolean reset) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        int shift = reset ? 0 : Math.floorMod(shift(playerId) + seasons, Season.values().length);
        db.sql("DELETE FROM player_flag WHERE player_id = ? AND flag LIKE ?").params(playerId, SHIFT + "%").update();
        if (shift != 0) {
            db.sql("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, ?, ?)")
                    .params(playerId, SHIFT + shift, java.sql.Timestamp.from(clock.instant())).update();
        }
        return state(playerId);
    }

    /** Стоит ли этой зимой теплица над грядкой с якорем (gardenKey, x, y). */
    public boolean covered(long playerId, String gardenKey, int x, int y) {
        return has(playerId, GREENHOUSE + slot(playerId) + ":" + gardenKey + ":" + x + ":" + y);
    }

    /**
     * Поставить теплицу над грядкой на эту зиму; (x, y) — якорь грядки (что это грядка, проверил сад).
     * Не зимой не нужна, над одной грядкой дважды — не ставится.
     */
    @Transactional
    public SeasonState buildGreenhouse(long playerId, String gardenKey, int x, int y) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        if (!state(playerId).cold()) {
            throw new ConflictException("Сейчас тепло — грядкам теплица не нужна.");
        }
        if (covered(playerId, gardenKey, x, y)) {
            throw new ConflictException("Над этой грядкой теплица уже стоит.");
        }
        inventory.spend(playerId, Inventory.LIFE_SEED, GREENHOUSE_COST, "Семена жизни");
        db.sql("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, ?, ?)")
                .params(playerId, GREENHOUSE + slot(playerId) + ":" + gardenKey + ":" + x + ":" + y, java.sql.Timestamp.from(clock.instant()))
                .update();
        return state(playerId);
    }

    private int shift(long playerId) {
        return db.sql("SELECT flag FROM player_flag WHERE player_id = ? AND flag LIKE ?")
                .params(playerId, SHIFT + "%").query(String.class).optional()
                .map(f -> Integer.parseInt(f.substring(SHIFT.length()))).orElse(0);
    }

    private boolean has(long playerId, String flag) {
        return db.sql("SELECT count(*) FROM player_flag WHERE player_id = ? AND flag = ?")
                .params(playerId, flag).query(Long.class).single() > 0;
    }

    /**
     * season — время года; cold — земля промёрзла (зима); greenhouses — якоря грядок под теплицами этой зимой;
     * endsAt — когда время года сменится само; wound — часы долины переведены.
     */
    public record SeasonState(Season season, boolean cold, List<Cell> greenhouses, Instant endsAt, boolean wound) {
    }

    /** Грядка: на какой локации и где. */
    public record Cell(String gardenKey, int x, int y) {
    }
}
