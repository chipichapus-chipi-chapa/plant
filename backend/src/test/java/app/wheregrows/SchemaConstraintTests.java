package app.wheregrows;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Ограничения в базе — последняя линия защиты на случай ошибки в коде.
 * Тесты в транзакции, которая откатывается, поэтому данные не остаются.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@Transactional
class SchemaConstraintTests {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void coinsCannotGoNegative() {
        long id = newPlayer("negative-coins");
        assertThatThrownBy(() -> jdbc.update("UPDATE player_profile SET coins = -1 WHERE user_id = ?", id))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void inventoryQuantityCannotGoNegative() {
        long id = newPlayer("negative-items");
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO inventory_item (player_id, item_key, quantity) VALUES (?, 'seed_radish', -1)", id))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void seedMustKnowWhatGrowsFromIt() {
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO item_def (key, kind, name, description) VALUES ('seed_mystery', 'SEED', 'Нечто', '?')"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private long newPlayer(String username) {
        long id = jdbc.queryForObject("INSERT INTO app_user (username) VALUES (?) RETURNING id", Long.class, username);
        jdbc.update("INSERT INTO player_profile (user_id, display_name, timezone) VALUES (?, 'Тест', 'UTC')", id);
        return id;
    }
}
