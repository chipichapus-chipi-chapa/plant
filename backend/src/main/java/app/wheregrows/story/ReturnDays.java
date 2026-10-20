package app.wheregrows.story;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import app.wheregrows.errand.ErrandService;

/**
 * Дни-возвращения: сколько разных дней игрок отметил хотя бы одну привычку с тех пор, как выполнено
 * поручение. Считаются дни, а не отметки; пропуски ничего не отнимают. На этом стоят туман над озером
 * и грибница в Грибной лощине.
 */
@Component
class ReturnDays {

    private final JdbcClient db;

    ReturnDays(JdbcClient db) {
        this.db = db;
    }

    /** Пусто — поручение ещё не выполнено, отсчёт не начат. Флаги тестирования добавляют по дню. */
    Optional<Long> since(long playerId, String errand) {
        Optional<Timestamp> since = db.sql("SELECT set_at FROM player_flag WHERE player_id = ? AND flag = ?")
                .params(playerId, ErrandService.DONE + errand)
                .query(Timestamp.class)
                .optional();
        if (since.isEmpty()) {
            return Optional.empty();
        }
        // день начала — по часовому поясу игрока: вечер, когда выполнено поручение, тоже считается
        ZoneId zone = ZoneId.of(db.sql("SELECT timezone FROM player_profile WHERE user_id = ?")
                .param(playerId).query(String.class).single());
        LocalDate from = since.get().toInstant().atZone(zone).toLocalDate();
        return Optional.of(db.sql("SELECT count(DISTINCT completed_on) FROM habit_completion WHERE player_id = ? AND completed_on >= ?")
                .params(playerId, from)
                .query(Long.class)
                .single()
                + db.sql("SELECT count(*) FROM player_flag WHERE player_id = ? AND flag LIKE ?")
                .params(playerId, FogService.TEST_DAY + "%")
                .query(Long.class)
                .single());
    }
}
