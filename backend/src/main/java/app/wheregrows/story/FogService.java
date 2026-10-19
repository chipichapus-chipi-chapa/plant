package app.wheregrows.story;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.errand.ErrandService;
import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;

/**
 * Туман над озером — вторая глава. Он начинается, когда ожил сад поместья, и редеет с каждым днём,
 * в который игрок отметил хотя бы одну привычку. Считаются дни, а не отметки: три привычки за вечер —
 * это всё равно один вечер, когда вы вернулись. Пропуски ничего не отнимают, туман никогда не сгущается.
 * <p>
 * Считает сервер — по отметкам привычек, которые он сам и записал, — поэтому прогресс нельзя подделать с клиента.
 */
@Service
public class FogService {

    private final GardenMaps maps;
    private final JdbcClient db;

    FogService(GardenMaps maps, JdbcClient db) {
        this.maps = maps;
        this.db = db;
    }

    /**
     * Состояние тумана; пусто, если ни над одной локацией тумана нет.
     *
     * @return started — туман уже начал редеть (сад поместья ожил); days — сколько дней-возвращений набралось
     *         (не больше needed); needed — сколько нужно, чтобы туман рассеялся
     */
    @Transactional(readOnly = true)
    public Optional<FogState> state(long playerId) {
        return maps.foggy().map(map -> state(playerId, map));
    }

    private FogState state(long playerId, GardenMap map) {
        GardenMap.Fog fog = map.fog();
        Optional<Timestamp> since = db.sql("SELECT set_at FROM player_flag WHERE player_id = ? AND flag = ?")
                .params(playerId, ErrandService.DONE + fog.after())
                .query(Timestamp.class)
                .optional();
        if (since.isEmpty()) {
            return new FogState(map.key(), false, 0, fog.days());
        }
        // день начала — по часовому поясу игрока: вечер пробуждения сада тоже считается
        ZoneId zone = ZoneId.of(db.sql("SELECT timezone FROM player_profile WHERE user_id = ?")
                .param(playerId).query(String.class).single());
        LocalDate from = since.get().toInstant().atZone(zone).toLocalDate();
        long days = db.sql("SELECT count(DISTINCT completed_on) FROM habit_completion WHERE player_id = ? AND completed_on >= ?")
                .params(playerId, from)
                .query(Long.class)
                .single();
        return new FogState(map.key(), true, (int) Math.min(days, fog.days()), fog.days());
    }

    /** map — над какой локацией туман; рассеялся, когда days == needed. */
    public record FogState(String map, boolean started, int days, int needed) {

        public boolean cleared() {
            return started && days >= needed;
        }
    }
}
