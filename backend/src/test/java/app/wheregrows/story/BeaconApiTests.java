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

/** Маяк на Ракушечном острове: окно загорается от привычки своего кристалла; Коре хватает трёх разных окон. */
@Import({TestcontainersConfiguration.class, BeaconApiTests.Clocks.class})
@SpringBootTest(properties = {"game.local.username=beacon-test", "game.local.timezone=Europe/Moscow"})
@AutoConfigureMockMvc
class BeaconApiTests {

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
        jdbc.update("DELETE FROM inventory_item WHERE player_id = ?", id);
        first = habit("Гулять", "sapphire");
        second = habit("Читать", "emerald");
    }

    long habit(String title, String crystal) throws Exception {
        String body = mvc.perform(post("/api/habits").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"crystalCategory\":" + (crystal == null ? "null" : "\"" + crystal + "\"") + "}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    void complete(long habit) throws Exception {
        mvc.perform(put("/api/habits/{id}/completions/today", habit)).andExpect(status().is2xxSuccessful());
    }

    /** Ярмарка открыта — с этого дня маяк ждёт огней. */
    void fairOpened() {
        jdbc.update("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, 'errand_done:fair_open', ?)",
                player.id(), java.sql.Timestamp.from(clock.instant()));
    }

    void nextDay() {
        clock.advance(Duration.ofDays(1));
    }

    @Test
    void lighthouseIsDarkUntilTheFairOpens() throws Exception {
        complete(first);

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.beacon.map").value("island"))
                .andExpect(jsonPath("$.beacon.started").value(false))
                .andExpect(jsonPath("$.beacon.lit").isEmpty())
                .andExpect(jsonPath("$.beacon.needed").value(3));
    }

    @Test
    void eachCrystalLightsItsOwnWindowAndThreeAreEnoughForKora() throws Exception {
        long plain = habit("Без кристалла", null);
        long walk = habit("Ещё прогулка", "sapphire");
        fairOpened();
        mvc.perform(post("/api/errands/{key}/accept", "kora_beacon")).andExpect(status().is2xxSuccessful());
        complete(first);
        complete(walk); // тот же кристалл — то же окно
        complete(plain); // без кристалла окна не зажигает
        complete(second);

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.beacon.started").value(true))
                .andExpect(jsonPath("$.beacon.lit[0]").value("emerald"))
                .andExpect(jsonPath("$.beacon.lit[1]").value("sapphire"));
        mvc.perform(post("/api/errands/{key}/complete", "kora_beacon")).andExpect(status().isConflict());

        nextDay(); // окна не гаснут
        complete(habit("Рисовать", "amethyst"));
        mvc.perform(post("/api/errands/{key}/complete", "kora_beacon"))
                .andExpect(status().is2xxSuccessful())
                .andExpect(jsonPath("$.reward[0].itemKey").value("beacon_shell"));
    }
}
