package app.wheregrows.mentor;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Проверка условий обучения по данным игрока. Простые запросы «есть ли хоть одна строка»
 * не стоит размазывать по репозиториям других модулей — они собраны здесь, в одном месте.
 */
@Component
class TutorialConditions {

    private final JdbcTemplate jdbc;

    TutorialConditions(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    boolean met(long playerId, Condition condition) {
        String sql = switch (condition) {
            case HABIT_CREATED -> "SELECT EXISTS (SELECT 1 FROM habit WHERE player_id = ?)";
            case REWARD_EARNED -> "SELECT EXISTS (SELECT 1 FROM habit_completion WHERE player_id = ? AND life_seeds > 0)";
            case PLANTED -> "SELECT EXISTS (SELECT 1 FROM garden_object WHERE player_id = ?)";
            case WORLD_INTERACTION -> """
                    SELECT EXISTS (SELECT 1 FROM player_discovery WHERE player_id = ?)
                        OR EXISTS (SELECT 1 FROM player_world_object WHERE player_id = ?)""";
        };
        // в каждом запросе все «?» — это id игрока
        Object[] args = new Object[(int) sql.chars().filter(c -> c == '?').count()];
        java.util.Arrays.fill(args, playerId);
        return Boolean.TRUE.equals(jdbc.queryForObject(sql, Boolean.class, args));
    }
}
