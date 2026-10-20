package app.wheregrows.story;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import app.wheregrows.TestcontainersConfiguration;
import app.wheregrows.player.CurrentPlayer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Осенняя ярмарка: три прилавка заполняют своим урожаем, и мельник открывает ярмарку и вручает ленту. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=fair-test")
@AutoConfigureMockMvc
class FairApiTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer player;

    long playerId;

    @BeforeEach
    void cleanSlate() {
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
        mvc.perform(post("/api/errands/{key}/complete", "fair_open"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reward[0].itemKey").value("fair_ribbon"));

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
