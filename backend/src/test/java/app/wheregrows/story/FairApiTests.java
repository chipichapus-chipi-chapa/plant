package app.wheregrows.story;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import app.wheregrows.MutableClock;
import app.wheregrows.TestcontainersConfiguration;
import app.wheregrows.player.CurrentPlayer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Осенняя ярмарка: прилавки заполняют своим урожаем, а открывает её мельник только в пятницу. */
@Import({TestcontainersConfiguration.class, FairApiTests.Clocks.class})
@SpringBootTest(properties = {"game.local.username=fair-test", "game.local.timezone=Europe/Moscow"})
@AutoConfigureMockMvc
class FairApiTests {

    /** Четверг, полдень по Москве. */
    static final Instant THURSDAY = Instant.parse("2026-10-15T09:00:00Z");

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(THURSDAY);
        }
    }

    @Autowired
    MutableClock clock;

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer player;

    long playerId;

    @BeforeEach
    void cleanSlate() {
        clock.set(THURSDAY);
        playerId = player.id();
        jdbc.update("DELETE FROM inventory_item WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM player_flag WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM player_world_object WHERE player_id = ?", playerId);
    }

    @Test
    void stallsAreFilledWithProduceAndTheMillerOpensTheFair() throws Exception {
        for (String[] g : new String[][] {{"produce_rose", "1"}, {"produce_iris", "1"}, {"produce_daisy", "1"},
                {"produce_radish", "2"}, {"produce_sunflower", "1"}, {"produce_moonflower", "1"}, {"produce_lily", "1"}}) {
            give(g[0], Integer.parseInt(g[1]));
        }
        mvc.perform(post("/api/errands/{key}/accept", "fair_open")).andExpect(status().isOk());

        cast("fill_stall_flowers").andExpect(status().isCreated());
        cast("fill_stall_veg").andExpect(status().isCreated());
        cast("fill_stall_moon").andExpect(status().isConflict()); // ромашек нет
        mvc.perform(post("/api/errands/{key}/complete", "fair_open")).andExpect(status().isConflict());

        give("produce_chamomile", 1);
        cast("fill_stall_moon").andExpect(status().isCreated());
        // всё готово, но сегодня четверг
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.errands[?(@.key == 'fair_open')].today").value(false));
        mvc.perform(post("/api/errands/{key}/complete", "fair_open")).andExpect(status().isConflict());

        clock.advance(Duration.ofDays(1));
        mvc.perform(post("/api/errands/{key}/complete", "fair_open"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reward[0].itemKey").value("fair_ribbon"));
        // день ярмарки запомнен: гости здесь только сегодня
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.errands[?(@.key == 'fair_open')].doneOn").value("2026-10-16"));

        assertThat(quantity("fair_ribbon")).isEqualTo(1);
        assertThat(quantity("produce_rose")).isZero();
    }

    private ResultActions cast(String recipe) throws Exception {
        return mvc.perform(post("/api/magic/recipes/{key}/cast", recipe));
    }

    private void give(String itemKey, int quantity) {
        jdbc.update("INSERT INTO inventory_item (player_id, item_key, quantity) VALUES (?, ?, ?)", playerId, itemKey, quantity);
    }

    private int quantity(String itemKey) {
        List<Integer> rows = jdbc.queryForList("SELECT quantity FROM inventory_item WHERE player_id = ? AND item_key = ?",
                Integer.class, playerId, itemKey);
        return rows.isEmpty() ? 0 : rows.get(0);
    }
}
