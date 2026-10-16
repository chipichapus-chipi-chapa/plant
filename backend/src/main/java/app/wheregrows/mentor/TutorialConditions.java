package app.wheregrows.mentor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import app.wheregrows.garden.GardenMaps;

/**
 * Проверка условий обучения по данным игрока. Простые запросы «есть ли хоть одна строка»
 * не стоит размазывать по репозиториям других модулей — они собраны здесь, в одном месте.
 */
@Component
class TutorialConditions {

    private final JdbcTemplate jdbc;
    private final GardenMaps maps;

    TutorialConditions(JdbcTemplate jdbc, GardenMaps maps) {
        this.jdbc = jdbc;
        this.maps = maps;
    }

    boolean met(long playerId, Condition condition) {
        if (condition == Condition.BEDS_WEEDED) {
            int overgrown = maps.home().cellsOfType("overgrown").size();
            Integer weeded = jdbc.queryForObject(
                    "SELECT count(*) FROM player_tile WHERE player_id = ? AND garden_key = ? AND state = 'WEEDED'",
                    Integer.class, playerId, maps.home().key());
            return weeded != null && weeded >= overgrown;
        }
        String sql = switch (condition) {
            case HABIT_CREATED -> "SELECT EXISTS (SELECT 1 FROM habit WHERE player_id = ?)";
            case REWARD_EARNED -> "SELECT EXISTS (SELECT 1 FROM habit_completion WHERE player_id = ? AND life_seeds > 0)";
            case PLANTED -> "SELECT EXISTS (SELECT 1 FROM garden_object WHERE player_id = ?)";
            case WORLD_INTERACTION -> """
                    SELECT EXISTS (SELECT 1 FROM player_discovery WHERE player_id = ?)
                        OR EXISTS (SELECT 1 FROM player_world_object WHERE player_id = ?)""";
            case TOOLS_TAKEN -> "SELECT EXISTS (SELECT 1 FROM player_discovery WHERE player_id = ? AND spot_key = 'fence_tools')";
            case BEDS_WEEDED -> throw new IllegalStateException("считается выше");
        };
        // в каждом запросе все «?» — это id игрока
        Object[] args = new Object[(int) sql.chars().filter(c -> c == '?').count()];
        java.util.Arrays.fill(args, playerId);
        return Boolean.TRUE.equals(jdbc.queryForObject(sql, Boolean.class, args));
    }
}
