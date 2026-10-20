package app.wheregrows.player;

import java.time.LocalDate;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Дата в долине: время года, день ярмарки, дни гостей. Обычно это сегодняшний день игрока, но у каждого
 * есть «часы долины» — их можно покрутить вперёд или назад (флаг valley_clock:N — на N дней).
 * Отметки привычек и награды за них живут по настоящему календарю ({@link GameCalendar}): часы их не трогают,
 * поэтому подкрутить себе лишних наград нельзя.
 */
@Component
public class ValleyCalendar {

    static final String CLOCK = "valley_clock:";
    /** Дальше двух кругов времён года крутить незачем. */
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

    /** Покрутить часы на days дней (вперёд или назад); 0 — вернуть настоящее время. Возвращает новый сдвиг. */
    @org.springframework.transaction.annotation.Transactional
    public int wind(long playerId, int days) {
        int offset = days == 0 ? 0 : Math.max(-LIMIT, Math.min(LIMIT, offset(playerId) + days));
        db.sql("DELETE FROM player_flag WHERE player_id = ? AND flag LIKE ?").params(playerId, CLOCK + "%").update();
        if (offset != 0) {
            db.sql("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, ?, now())").params(playerId, CLOCK + offset).update();
        }
        return offset;
    }

    /** На сколько дней перемотаны часы (0 — не перемотаны). */
    public int offset(long playerId) {
        return db.sql("SELECT flag FROM player_flag WHERE player_id = ? AND flag LIKE ?")
                .params(playerId, CLOCK + "%")
                .query(String.class)
                .optional()
                .map(f -> Integer.parseInt(f.substring(CLOCK.length())))
                .orElse(0);
    }
}
