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

/** Времена года (каждое — полчаса): зимой земля промерзает и сажать можно только под теплицей над грядкой; весной теплицы пропадают. */
@Import({TestcontainersConfiguration.class, SeasonApiTests.Clocks.class})
@SpringBootTest(properties = {"game.local.username=season-test", "game.local.timezone=Europe/Moscow"})
@AutoConfigureMockMvc
class SeasonApiTests {

    /** Зимний отрезок: времена года меняются каждые полчаса. */
    static final Instant WINTER_TIME = Instant.parse("2026-10-28T11:30:00Z");
    /** Через полчаса — весна. */
    static final Instant SPRING_TIME = Instant.parse("2026-10-28T12:00:00Z");

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {
        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(WINTER_TIME);
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
        clock.set(WINTER_TIME);
        playerId = player.id();
        jdbc.update("DELETE FROM garden_object WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM inventory_item WHERE player_id = ?", playerId);
        jdbc.update("DELETE FROM player_flag WHERE player_id = ?", playerId);
        give("seed_radish", 5);
    }

    @Test
    void inWinterAGreenhouseCoversAWholeBedAndInSpringItIsGone() throws Exception {
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.season.season").value("WINTER"))
                .andExpect(jsonPath("$.season.cold").value(true))
                .andExpect(jsonPath("$.season.greenhouses").isEmpty());
        plant("home", 3, 5).andExpect(status().isConflict());

        greenhouse("home", 4, 6).andExpect(status().isConflict()); // не хватает Семян
        give("life_seed", 20);
        // нижняя грядка дома — клетки x 2..7, y 5..6; теплица встаёт над всей, якорь — верхняя левая клетка
        greenhouse("home", 4, 6)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.greenhouses[0].gardenKey").value("home"))
                .andExpect(jsonPath("$.greenhouses[0].x").value(2))
                .andExpect(jsonPath("$.greenhouses[0].y").value(5));
        greenhouse("home", 7, 5).andExpect(status().isConflict()); // та же грядка — уже стоит
        greenhouse("home", 1, 1).andExpect(status().isBadRequest()); // не грядка

        plant("home", 3, 5).andExpect(status().isCreated());
        plant("home", 7, 6).andExpect(status().isCreated()); // вся грядка под стеклом
        plant("town", 8, 9).andExpect(status().isConflict()); // в городке своя грядка — без теплицы
        greenhouse("town", 8, 9).andExpect(status().isCreated());
        plant("town", 8, 9).andExpect(status().isCreated());

        clock.set(SPRING_TIME);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.season.season").value("SPRING"))
                .andExpect(jsonPath("$.season.cold").value(false))
                .andExpect(jsonPath("$.season.greenhouses").isEmpty())
                .andExpect(jsonPath("$.garden.objects.length()").value(3)); // посаженное не пропало
        plant("home", 4, 5).andExpect(status().isCreated());
        greenhouse("home", 5, 5).andExpect(status().isConflict()); // тепло
    }

    @Test
    void theValleyClockShiftsSeasonsAndDaysButNotTheHabits() throws Exception {
        clock.set(Instant.parse("2026-10-28T11:10:00Z")); // осенний отрезок
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.season.season").value("AUTUMN"))
                .andExpect(jsonPath("$.season.endsAt").value("2026-10-28T11:30:00Z"));

        wind(1).andExpect(jsonPath("$.season").value("WINTER")).andExpect(jsonPath("$.wound").value(true));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.today").value("2026-10-28")); // день — настоящий
        wind(-2).andExpect(jsonPath("$.season").value("SUMMER"));
        windDays(3);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.valleyToday").value("2026-10-31"))
                .andExpect(jsonPath("$.today").value("2026-10-28"));
        reset().andExpect(jsonPath("$.season").value("AUTUMN")).andExpect(jsonPath("$.wound").value(false));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.valleyToday").value("2026-10-28"));
    }

    private ResultActions wind(int seasons) throws Exception {
        return mvc.perform(post("/api/valley/clock").contentType(MediaType.APPLICATION_JSON).content("{\"seasons\":" + seasons + "}"));
    }

    private void windDays(int days) throws Exception {
        mvc.perform(post("/api/valley/clock").contentType(MediaType.APPLICATION_JSON).content("{\"days\":" + days + "}"))
                .andExpect(status().isOk());
    }

    private ResultActions reset() throws Exception {
        return mvc.perform(post("/api/valley/clock").contentType(MediaType.APPLICATION_JSON).content("{\"reset\":true}"));
    }

    private ResultActions greenhouse(String garden, int x, int y) throws Exception {
        return mvc.perform(post("/api/garden/greenhouses").contentType(MediaType.APPLICATION_JSON)
                .content("{\"gardenKey\":\"" + garden + "\",\"x\":" + x + ",\"y\":" + y + "}"));
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
