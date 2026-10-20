package app.wheregrows.gift;

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
import org.springframework.http.MediaType;
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

/** Урожай со взрослых растений и подарки жителям: раз в день каждому, любимое — радует больше. */
@Import({TestcontainersConfiguration.class, HarvestAndGiftApiTests.Clocks.class})
@SpringBootTest(properties = "game.local.username=gift-test")
@AutoConfigureMockMvc
class HarvestAndGiftApiTests {

    static final Instant START = Instant.parse("2026-10-15T10:00:00Z");

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(START);
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    MutableClock clock;

    @Autowired
    CurrentPlayer player;

    long playerId;

    @BeforeEach
    void cleanSlate() {
        clock.set(START);
        playerId = player.id();
        jdbc.update("DELETE FROM garden_object WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM inventory_item WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM player_flag WHERE player_id = ?", playerId);
    }

    @Test
    void ripeRadishIsHarvestedOnceAndFreesTheBed() throws Exception {
        give("seed_radish", 2);
        plant();

        harvest("home", 3, 5).andExpect(status().isConflict()); // ещё растёт
        clock.advance(Duration.ofMinutes(40));

        harvest("home", 3, 5)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.itemKey").value("produce_radish"))
                .andExpect(jsonPath("$.quantity").value(2));
        assertThat(quantity("produce_radish")).isEqualTo(2);
        harvest("home", 3, 5).andExpect(status().isNotFound());

        plant(); // грядка снова свободна
    }

    @Test
    void lovedGiftDelightsAndEachPersonGetsOneGiftADay() throws Exception {
        give("produce_rose", 2);
        give("produce_radish", 1);

        gift("agata", "produce_rose")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.loved").value(true))
                .andExpect(jsonPath("$.talk").value("agata_gift"))
                .andExpect(jsonPath("$.reward[0].quantity").value(3));
        // Агата дома — тот же человек
        gift("agata-home", "produce_rose").andExpect(status().isConflict());
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.giftedToday[0]").value("agata"));

        clock.advance(Duration.ofDays(1));
        gift("agata-home", "produce_radish")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.loved").value(false))
                .andExpect(jsonPath("$.talk").doesNotExist());
        assertThat(quantity("life_seed")).isEqualTo(4);
        assertThat(quantity("produce_rose")).isEqualTo(1);
    }

    @Test
    void onlyProduceFromTheBagCanBeGiven() throws Exception {
        give("seed_radish", 1);
        gift("krupka", "seed_radish").andExpect(status().isBadRequest());
        gift("krupka", "produce_sunflower").andExpect(status().isConflict()); // в сумке нет
        gift("dragon", "produce_sunflower").andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM player_flag WHERE player_id = ?", Integer.class, playerId)).isZero();
    }

    private void plant() throws Exception {
        mvc.perform(post("/api/garden/plantings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"x\":3,\"y\":5,\"seedItemKey\":\"seed_radish\"}")).andExpect(status().isCreated());
    }

    private ResultActions harvest(String garden, int x, int y) throws Exception {
        return mvc.perform(post("/api/garden/harvests").contentType(MediaType.APPLICATION_JSON)
                .content("{\"gardenKey\":\"" + garden + "\",\"x\":" + x + ",\"y\":" + y + "}"));
    }

    private ResultActions gift(String npc, String item) throws Exception {
        return mvc.perform(post("/api/npcs/{key}/gifts", npc).contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemKey\":\"" + item + "\"}"));
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
