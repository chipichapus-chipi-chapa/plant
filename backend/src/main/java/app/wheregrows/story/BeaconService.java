package app.wheregrows.story;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;

/**
 * Маяк на Ракушечном острове (глава 5): в нём по окну на каждый кристалл. Окно загорается своим цветом,
 * когда после поручения after игрок отметил привычку этого кристалла. Смотрительнице хватит нескольких
 * разных окон (needed) — остальные для красоты: глава мягко зовёт разнообразить дела, но не требует всего сразу.
 * Окна не гаснут. Считает сервер — по отметкам, которые он сам записал.
 */
@Service
public class BeaconService {

    /** Флаги кнопки тестирования «Маяк: +окно» (test_beacon:emerald…): окно этого кристалла горит. */
    public static final String TEST_WINDOW = "test_beacon:";

    private final GardenMaps maps;
    private final ReturnDays days;
    private final JdbcClient db;

    BeaconService(GardenMaps maps, ReturnDays days, JdbcClient db) {
        this.maps = maps;
        this.days = days;
        this.db = db;
    }

    /** Состояние маяка; пусто, если маяка нет ни на одной локации. */
    @Transactional(readOnly = true)
    public Optional<BeaconState> state(long playerId) {
        return maps.beaconed().map(map -> {
            GardenMap.Beacon beacon = map.beacon();
            return days.startDay(playerId, beacon.after())
                    .map(from -> new BeaconState(map.key(), beacon.prop(), true, lit(playerId, from), beacon.needed()))
                    .orElse(new BeaconState(map.key(), beacon.prop(), false, List.of(), beacon.needed()));
        });
    }

    private List<String> lit(long playerId, java.time.LocalDate from) {
        List<String> habits = db.sql("""
                        SELECT DISTINCT h.crystal_category FROM habit_completion c JOIN habit h ON h.id = c.habit_id
                        WHERE c.player_id = ? AND c.completed_on >= ? AND h.crystal_category IS NOT NULL""")
                .params(playerId, from)
                .query(String.class)
                .list();
        List<String> tests = db.sql("SELECT substring(flag from ?) FROM player_flag WHERE player_id = ? AND flag LIKE ?")
                .params(TEST_WINDOW.length() + 1, playerId, TEST_WINDOW + "%")
                .query(String.class)
                .list();
        return Stream.concat(habits.stream(), tests.stream()).distinct().sorted().toList();
    }

    /**
     * map, prop — где маяк; started — смотрительница ждёт огней (поручение after выполнено);
     * lit — кристаллы, чьи окна горят; needed — сколько разных окон нужно смотрительнице.
     */
    public record BeaconState(String map, String prop, boolean started, List<String> lit, int needed) {

        public boolean enough() {
            return started && lit.size() >= needed;
        }
    }
}
