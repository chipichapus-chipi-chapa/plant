package app.wheregrows.player;

import java.time.LocalDate;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * День в долине: по нему живут дни недели — пятничная ярмарка, субботний хлеб, гости. Обычно это сегодняшний
 * день игрока, но часы долины можно покрутить на дни вперёд или назад (флаг day_shift:N). Отметки привычек и
 * награды за них живут по настоящему календарю ({@link GameCalendar}): часы их не трогают.
 */
@Component
public class ValleyCalendar {

    static final String SHIFT = "day_shift:";
    /** Дальше пары месяцев крутить незачем. */
    static final int LIMIT = 56;

    private final GameCalendar calendar;
    private final JdbcClient db;

    ValleyCalendar(GameCalendar calendar, JdbcClient db) {
        this.calendar = calendar;
        this.db = db;
    }

    public LocalDate today(PlayerProfile player) {
        return calendar.today(player).plusDays(offset(player.getId()));
    }

    /** На сколько дней перемотаны часы (0 — не перемотаны). */
    public int offset(long playerId) {
        return db.sql("SELECT flag FROM player_flag WHERE player_id = ? AND flag LIKE ?")
                .params(playerId, SHIFT + "%")
                .query(String.class)
                .optional()
                .map(f -> Integer.parseInt(f.substring(SHIFT.length())))
                .orElse(0);
    }

    /** Покрутить часы на days дней (вперёд или назад); reset — вернуть настоящий день. */
    @Transactional
    public void wind(long playerId, int days, boolean reset) {
        int offset = reset ? 0 : Math.max(-LIMIT, Math.min(LIMIT, offset(playerId) + days));
        db.sql("DELETE FROM player_flag WHERE player_id = ? AND flag LIKE ?").params(playerId, SHIFT + "%").update();
        if (offset != 0) {
            db.sql("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, ?, now())").params(playerId, SHIFT + offset).update();
        }
    }
}
