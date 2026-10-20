package app.wheregrows.story;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /** Флаги кнопки тестирования «+1 день с привычками» (test_fog_day:1, :2…): каждый — ещё один день для тумана и грибницы. */
    public static final String TEST_DAY = "test_fog_day:";

    private final GardenMaps maps;
    private final ReturnDays days;

    FogService(GardenMaps maps, ReturnDays days) {
        this.maps = maps;
        this.days = days;
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
        return days.since(playerId, fog.after())
                .map(d -> new FogState(map.key(), true, (int) Math.min(d, fog.days()), fog.days()))
                .orElse(new FogState(map.key(), false, 0, fog.days()));
    }

    /** map — над какой локацией туман; рассеялся, когда days == needed. */
    public record FogState(String map, boolean started, int days, int needed) {

        public boolean cleared() {
            return started && days >= needed;
        }
    }
}
