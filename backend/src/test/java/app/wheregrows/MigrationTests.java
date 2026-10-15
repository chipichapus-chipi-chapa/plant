package app.wheregrows;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Миграции не должны терять прогресс игроков. Прогоняем их в отдельной схеме:
 * сначала до старой версии, кладём данные «как у живого игрока», затем до актуальной.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class MigrationTests {

    @Autowired
    DataSource dataSource;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void v2MovesCoinsIntoInventoryAsLifeSeeds() {
        // Только V1: актуальный R__content.sql уже ссылается на колонки из V2.
        // В живой базе Flyway всегда выполняет V-миграции раньше repeatable, так что проблема лишь тестовая.
        flyway("1").repeatableSqlMigrationPrefix("SKIP__").load().migrate();
        jdbc.update("INSERT INTO migration_check.app_user (username) VALUES ('old-player')");
        jdbc.update("""
                INSERT INTO migration_check.player_profile (user_id, display_name, timezone, coins)
                SELECT id, 'Старожил', 'UTC', 7 FROM migration_check.app_user""");

        flyway("latest").load().migrate();

        assertThat(jdbc.queryForObject(
                "SELECT quantity FROM migration_check.inventory_item WHERE item_key = 'life_seed'", Integer.class))
                .isEqualTo(7);
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM information_schema.columns
                WHERE table_schema = 'migration_check' AND table_name = 'player_profile' AND column_name = 'coins'""",
                Integer.class)).isZero();
    }

    private FluentConfiguration flyway(String target) {
        return Flyway.configure()
                .dataSource(dataSource)
                .schemas("migration_check")
                .target(target);
    }
}
