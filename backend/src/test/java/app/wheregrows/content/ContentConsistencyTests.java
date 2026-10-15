package app.wheregrows.content;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.TestcontainersConfiguration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@Transactional
class ContentConsistencyTests {

    @Autowired
    ContentConsistency consistency;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void shippedContentIsConsistent() {
        assertThatCode(() -> consistency.run(new DefaultApplicationArguments())).doesNotThrowAnyException();
    }

    @Test
    void recipeTargetingMissingObjectIsRejected() {
        jdbc.update("""
                INSERT INTO recipe_def (key, name, description, target_object_key, result_text, sort_order)
                VALUES ('broken', 'Сломанный', '', 'no-such-prop', '', 99)""");

        assertThatThrownBy(() -> consistency.run(new DefaultApplicationArguments()))
                .hasMessageContaining("no-such-prop");
    }

    @Test
    void discoverySpotOnMissingObjectIsRejected() {
        jdbc.update("""
                INSERT INTO discovery_spot (key, prop_key, found_text, empty_text)
                VALUES ('nowhere', 'ghost-tree', '', '')""");

        assertThatThrownBy(() -> consistency.run(new DefaultApplicationArguments()))
                .hasMessageContaining("ghost-tree");
    }
}
