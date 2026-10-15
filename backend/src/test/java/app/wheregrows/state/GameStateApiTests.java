package app.wheregrows.state;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;

import app.wheregrows.TestcontainersConfiguration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import({TestcontainersConfiguration.class, GameStateApiTests.FixedClock.class})
@SpringBootTest(properties = {"game.local.username=state-test", "game.local.timezone=Asia/Vladivostok"})
@AutoConfigureMockMvc
class GameStateApiTests {

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedClock {

        /** 15 октября, 20:00 по UTC — во Владивостоке (UTC+10) уже 16 октября. */
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(Instant.parse("2026-10-15T20:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired
    MockMvc mvc;

    @Test
    void stateDescribesTheLocalPlayer() throws Exception {
        mvc.perform(get("/api/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.player.displayName").value("Садовник"))
                .andExpect(jsonPath("$.player.timezone").value("Asia/Vladivostok"))
                .andExpect(jsonPath("$.inventory").isEmpty())
                .andExpect(jsonPath("$.habits").isEmpty())
                .andExpect(jsonPath("$.dailyRewards.used").value(0))
                .andExpect(jsonPath("$.dailyRewards.limit").value(6))
                .andExpect(jsonPath("$.garden.objects").isEmpty());
    }

    @Test
    void todayIsComputedInThePlayersTimezone() throws Exception {
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.today").value("2026-10-16"));
    }
}
