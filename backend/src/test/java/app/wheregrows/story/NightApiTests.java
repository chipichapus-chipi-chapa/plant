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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import app.wheregrows.MutableClock;
import app.wheregrows.TestcontainersConfiguration;
import app.wheregrows.player.CurrentPlayer;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/** Ночь — по часам игрока (с 20:00 до 6:00 в его часовом поясе); тестировщик может объявить её кнопкой. */
@Import({TestcontainersConfiguration.class, NightApiTests.Clocks.class})
@SpringBootTest(properties = {"game.local.username=night-test", "game.local.timezone=Asia/Vladivostok"})
@AutoConfigureMockMvc
class NightApiTests {

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(Instant.parse("2026-10-15T02:00:00Z"));
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    MutableClock clock;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer player;

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM player_flag WHERE player_id = ?", player.id());
    }

    @Test
    void nightFollowsThePlayersClock() throws Exception {
        clock.set(Instant.parse("2026-10-15T02:00:00Z")); // во Владивостоке 12:00 — день
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.night").value(false));

        clock.set(Instant.parse("2026-10-15T11:30:00Z")); // во Владивостоке 21:30 — ночь
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.night").value(true));

        clock.set(Instant.parse("2026-10-15T19:00:00Z")); // во Владивостоке 5:00 — ещё ночь
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.night").value(true));
    }

    @Test
    void testerCanToggleNight() throws Exception {
        clock.set(Instant.parse("2026-10-15T02:00:00Z"));
        mvc.perform(post("/api/test/night"));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.night").value(true));

        mvc.perform(post("/api/test/night"));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.night").value(false));
    }
}
