package app.wheregrows.story;

import java.time.Clock;
import java.time.LocalTime;
import java.time.ZoneId;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ночь — по часам игрока: с 20:00 до 6:00 в его часовом поясе. Ночью открывается тропка на Лунную поляну.
 * Считает сервер (часовой пояс игрока он знает сам), а тестировщик может объявить ночь кнопкой.
 */
@Service
public class NightService {

    /** Флаг кнопки тестирования «Сейчас ночь». */
    public static final String TEST_NIGHT = "test_night";

    static final LocalTime DUSK = LocalTime.of(20, 0);
    static final LocalTime DAWN = LocalTime.of(6, 0);

    private final JdbcClient db;
    private final Clock clock;

    NightService(JdbcClient db, Clock clock) {
        this.db = db;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public boolean isNight(long playerId) {
        ZoneId zone = ZoneId.of(db.sql("SELECT timezone FROM player_profile WHERE user_id = ?")
                .param(playerId).query(String.class).single());
        LocalTime now = LocalTime.now(clock.withZone(zone));
        if (!now.isBefore(DUSK) || now.isBefore(DAWN)) {
            return true;
        }
        return db.sql("SELECT count(*) FROM player_flag WHERE player_id = ? AND flag = ?")
                .params(playerId, TEST_NIGHT).query(Long.class).single() > 0;
    }
}
