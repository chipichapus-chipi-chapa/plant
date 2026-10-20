package app.wheregrows.story;

import java.time.Duration;
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

import app.wheregrows.MutableClock;
import app.wheregrows.TestcontainersConfiguration;
import app.wheregrows.player.CurrentPlayer;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Субботний хлеб: раз в неделю, когда Агата дома и печь горит; каравай — 2 + дни недели с привычками. */
@Import({TestcontainersConfiguration.class, BreadApiTests.Clocks.class})
@SpringBootTest(properties = {"game.local.username=bread-test", "game.local.timezone=UTC"})
@AutoConfigureMockMvc
class BreadApiTests {

    /** Понедельник, 12 октября 2026 */
    static final Instant MONDAY = Instant.parse("2026-10-12T10:00:00Z");

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(MONDAY);
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

    long habit;

    @BeforeEach
    void freshWeek() throws Exception {
        clock.set(MONDAY);
        long id = player.id();
        jdbc.update("DELETE FROM habit_completion WHERE player_id = ?", id);
        jdbc.update("DELETE FROM habit WHERE player_id = ?", id);
        jdbc.update("DELETE FROM player_flag WHERE player_id = ?", id);
        jdbc.update("DELETE FROM inventory_item WHERE player_id = ?", id);
        String body = mvc.perform(post("/api/habits").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Гулять\",\"crystalCategory\":null}"))
                .andReturn().getResponse().getContentAsString();
        habit = Long.parseLong(body.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    void hearthLit() {
        jdbc.update("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, 'errand_done:agata_hearth', now())", player.id());
    }

    void habitToday() throws Exception {
        mvc.perform(put("/api/habits/{id}/completions/today", habit)).andExpect(status().is2xxSuccessful());
    }

    void days(int n) {
        clock.advance(Duration.ofDays(n));
    }

    @Test
    void onSaturdayTheLoafCountsTheGoodDaysOfTheWeek() throws Exception {
        hearthLit();
        habitToday();      // понедельник
        days(2);
        habitToday();      // среда
        days(1);
        habitToday();      // четверг
        days(2);           // суббота

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.bread.home").value(true))
                .andExpect(jsonPath("$.bread.today").value(true))
                .andExpect(jsonPath("$.bread.days").value(3))
                .andExpect(jsonPath("$.bread.loaf").value(5));
        mvc.perform(post("/api/story/bread"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days").value(3))
                .andExpect(jsonPath("$.reward[0].quantity").value(5));
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.bread.baked").value(true))
                .andExpect(jsonPath("$.inventory[?(@.itemKey == 'life_seed')].quantity").value(5 + 3 * 3));
    }

    @Test
    void onlyOnceAWeek() throws Exception {
        hearthLit();
        days(5);
        mvc.perform(post("/api/story/bread")).andExpect(status().isOk());

        mvc.perform(post("/api/story/bread")).andExpect(status().isConflict());

        days(7); // следующая суббота — новый каравай
        mvc.perform(post("/api/story/bread")).andExpect(status().isOk());
    }

    @Test
    void notOnOtherDaysAndNotWithAColdHearth() throws Exception {
        days(5);
        mvc.perform(post("/api/story/bread")).andExpect(status().isConflict()); // печь холодная

        hearthLit();
        days(1); // воскресенье
        mvc.perform(post("/api/story/bread")).andExpect(status().isConflict());
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.bread.today").value(false));
    }

    @Test
    void valleyClockReachesSaturdayButTheLoafIsOncePerRealWeek() throws Exception {
        hearthLit();
        wind(5); // понедельник + 5 — в долине суббота
        mvc.perform(post("/api/story/bread")).andExpect(status().isOk());

        wind(7); // ещё неделя по часам долины — но настоящая неделя та же
        mvc.perform(post("/api/story/bread")).andExpect(status().isConflict());
        wind(0);
    }

    private void wind(int days) throws Exception {
        mvc.perform(post("/api/valley/clock").contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{\"days\":" + days + "}")).andExpect(status().isOk());
    }
}
