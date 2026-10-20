package app.wheregrows.story;

import java.time.Instant;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Времена года (по неделе каждое): зимой земля промерзает и сажать можно только в теплице у дома; весной теплица пропадает. */
@Import({TestcontainersConfiguration.class, SeasonApiTests.Clocks.class})
@SpringBootTest(properties = {"game.local.username=season-test", "game.local.timezone=Europe/Moscow"})
@AutoConfigureMockMvc
class SeasonApiTests {

    /** Неделя с 26 октября 2026 — зимняя. */
    static final Instant WINTER_WEEK = Instant.parse("2026-10-28T10:00:00Z");
    /** Следующая неделя — весна. */
    static final Instant SPRING_WEEK = Instant.parse("2026-11-04T10:00:00Z");

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(WINTER_WEEK);
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
        clock.set(WINTER_WEEK);
        playerId = player.id();
        jdbc.update("DELETE FROM garden_object WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM inventory_item WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM player_flag WHERE player_id = ?", playerId);
        give("seed_radish", 5);
    }

    @Test
    void inWinterOnlyTheGreenhouseBedsTakeSeedsAndInSpringItIsGone() throws Exception {
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.season.season").value("WINTER"))
                .andExpect(jsonPath("$.season.cold").value(true))
                .andExpect(jsonPath("$.season.greenhouse").value(false));
        plant("home", 3, 5).andExpect(status().isConflict());

        mvc.perform(post("/api/garden/greenhouse")).andExpect(status().isConflict()); // не хватает
        give("life_seed", 20);
        give("shard_amber", 1);
        mvc.perform(post("/api/garden/greenhouse"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.greenhouse").value(true));
        mvc.perform(post("/api/garden/greenhouse")).andExpect(status().isConflict()); // уже стоит

        plant("home", 3, 5).andExpect(status().isCreated());
        plant("town", 8, 9).andExpect(status().isConflict()); // в городке промёрзло

        clock.set(SPRING_WEEK);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.season.season").value("SPRING"))
                .andExpect(jsonPath("$.season.cold").value(false))
                .andExpect(jsonPath("$.season.greenhouse").value(false))
                .andExpect(jsonPath("$.garden.objects[0].speciesKey").value("radish")); // посаженное не пропало
        plant("town", 8, 9).andExpect(status().isCreated());
        mvc.perform(post("/api/garden/greenhouse")).andExpect(status().isConflict()); // тепло
    }

    @Test
    void theClockWindsTheValleyForwardButNotTheHabits() throws Exception {
        clock.set(Instant.parse("2026-10-21T10:00:00Z")); // осенняя неделя
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.season.season").value("AUTUMN"));

        mvc.perform(post("/api/valley/clock").contentType(MediaType.APPLICATION_JSON).content("{\"days\":7}"))
                .andExpect(jsonPath("$.offset").value(7));
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.season.season").value("WINTER"))
                .andExpect(jsonPath("$.valleyToday").value("2026-10-28"))
                .andExpect(jsonPath("$.today").value("2026-10-21")); // привычки — по настоящему календарю

        mvc.perform(post("/api/valley/clock").contentType(MediaType.APPLICATION_JSON).content("{\"days\":-14}"))
                .andExpect(jsonPath("$.offset").value(-7));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.season.season").value("SUMMER"));
        mvc.perform(post("/api/valley/clock").contentType(MediaType.APPLICATION_JSON).content("{\"days\":0}"))
                .andExpect(jsonPath("$.offset").value(0));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.season.season").value("AUTUMN"));
    }

    private ResultActions plant(String garden, int x, int y) throws Exception {
        return mvc.perform(post("/api/garden/plantings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"gardenKey\":\"" + garden + "\",\"x\":" + x + ",\"y\":" + y + ",\"seedItemKey\":\"seed_radish\"}"));
    }

    private void give(String itemKey, int quantity) {
        jdbc.update("""
                INSERT INTO inventory_item (player_id, item_key, quantity) VALUES (?, ?, ?)
                ON CONFLICT (player_id, item_key) DO UPDATE SET quantity = inventory_item.quantity + EXCLUDED.quantity""",
                playerId, itemKey, quantity);
    }
}
