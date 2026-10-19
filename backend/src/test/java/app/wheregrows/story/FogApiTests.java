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

/** Туман над озером: редеет с каждым днём, когда отмечена хоть одна привычка после пробуждения сада поместья. */
@Import({TestcontainersConfiguration.class, FogApiTests.Clocks.class})
@SpringBootTest(properties = {"game.local.username=fog-test", "game.local.timezone=Europe/Moscow"})
@AutoConfigureMockMvc
class FogApiTests {

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

    long first;
    long second;

    @BeforeEach
    void cleanSlate() throws Exception {
        clock.set(START);
        long id = player.id();
        jdbc.update("DELETE FROM habit_completion WHERE player_id = ?", id);
        jdbc.update("DELETE FROM habit WHERE player_id = ?", id);
        jdbc.update("DELETE FROM player_flag WHERE player_id = ?", id);
        first = habit("Гулять");
        second = habit("Читать");
    }

    long habit(String title) throws Exception {
        String body = mvc.perform(post("/api/habits").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"crystalCategory\":null}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    void complete(long habit) throws Exception {
        mvc.perform(put("/api/habits/{id}/completions/today", habit)).andExpect(status().is2xxSuccessful());
    }

    /** Сад поместья ожил (поручение Мяты выполнено) — в этот момент туман начинает редеть. */
    void gardenRevived() {
        jdbc.update("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, 'errand_done:myata_garden', ?)",
                player.id(), java.sql.Timestamp.from(clock.instant()));
    }

    void nextDay() {
        clock.advance(Duration.ofDays(1));
    }

    @Test
    void fogIsThickUntilTheManorGardenWakesUp() throws Exception {
        complete(first);

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.fog.map").value("lake"))
                .andExpect(jsonPath("$.fog.started").value(false))
                .andExpect(jsonPath("$.fog.days").value(0))
                .andExpect(jsonPath("$.fog.needed").value(7));
    }

    @Test
    void everyDayYouComeBackCountsOnceNoMatterHowManyHabits() throws Exception {
        complete(first); // до пробуждения сада — не считается
        nextDay();
        gardenRevived();
        complete(first);
        complete(second); // тот же день — один день
        nextDay();
        nextDay(); // пропуск ничего не отнимает
        complete(second);

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.fog.started").value(true))
                .andExpect(jsonPath("$.fog.days").value(2));
    }

    @Test
    void fogClearsAfterSevenDaysAndStaysCleared() throws Exception {
        gardenRevived();
        for (int i = 0; i < 9; i++) {
            complete(first);
            nextDay();
        }

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.fog.days").value(7))
                .andExpect(jsonPath("$.fog.needed").value(7));
    }
}
