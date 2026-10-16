package app.wheregrows.errand;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Поручения жителей Восточной тропы (content/gardens/east.json). */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=errand-test")
@AutoConfigureMockMvc
class ErrandApiTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer currentPlayer;

    long playerId;

    @BeforeEach
    void freshStart() {
        playerId = currentPlayer.id();
        jdbc.update("DELETE FROM player_flag WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM player_discovery WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM inventory_item WHERE player_id = ?", playerId);
    }

    @Test
    void errandMustBeAskedFirstAndPaysOnce() throws Exception {
        give("seed_sunflower", 1);
        complete("krupka_seeds").andExpect(status().isConflict());

        accept("krupka_seeds").andExpect(jsonPath("$.offered").value(true));
        complete("krupka_seeds")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reward[0].itemKey").value("seed_radish"));
        assertThat(quantity("seed_sunflower")).isZero();
        assertThat(quantity("seed_radish")).isEqualTo(2);

        complete("krupka_seeds").andExpect(status().isConflict());
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.errands[?(@.key == 'krupka_seeds')].done").value(true));
    }

    @Test
    void notEnoughMeansNothingIsTaken() throws Exception {
        accept("khmur_toll");
        give("old_lantern", 1);
        give("life_seed", 2); // нужно три
        complete("khmur_toll").andExpect(status().isConflict());
        assertThat(quantity("old_lantern")).isEqualTo(1);
        assertThat(quantity("life_seed")).isEqualTo(2);
    }

    @Test
    void showErrandNeedsTheFind() throws Exception {
        accept("shorokh_shine");
        complete("shorokh_shine")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Пока нечего показать."));
        jdbc.update("INSERT INTO player_discovery VALUES (?, 'bridge_compass', now())", playerId);
        complete("shorokh_shine").andExpect(status().isOk());
        assertThat(quantity("life_seed")).isEqualTo(3);
    }

    @Test
    void lanternChainOpensThePath() throws Exception {
        accept("vetosh_crumbs");
        give("life_seed", 8);
        complete("vetosh_crumbs").andExpect(jsonPath("$.reward[0].itemKey").value("old_lantern"));
        accept("khmur_toll");
        complete("khmur_toll").andExpect(status().isOk());
        assertThat(quantity("old_lantern")).isZero();
        assertThat(quantity("life_seed")).isZero();
    }

    private ResultActions accept(String key) throws Exception {
        return mvc.perform(post("/api/errands/" + key + "/accept"));
    }

    private ResultActions complete(String key) throws Exception {
        return mvc.perform(post("/api/errands/" + key + "/complete"));
    }

    private void give(String itemKey, int quantity) {
        jdbc.update("INSERT INTO inventory_item (player_id, item_key, quantity) VALUES (?, ?, ?) "
                + "ON CONFLICT (player_id, item_key) DO UPDATE SET quantity = EXCLUDED.quantity", playerId, itemKey, quantity);
    }

    private int quantity(String itemKey) {
        List<Integer> rows = jdbc.queryForList(
                "SELECT quantity FROM inventory_item WHERE player_id = ? AND item_key = ?", Integer.class, playerId, itemKey);
        return rows.isEmpty() ? 0 : rows.get(0);
    }
}
