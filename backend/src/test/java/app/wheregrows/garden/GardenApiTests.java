package app.wheregrows.garden;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Посадка на настоящей карте home.json: грядки — клетки x 2..7, y 5..6. */
@Import({TestcontainersConfiguration.class, GardenApiTests.Clocks.class})
@SpringBootTest(properties = "game.local.username=garden-test")
@AutoConfigureMockMvc
class GardenApiTests {

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
    CurrentPlayer currentPlayer;

    @Autowired
    GardenService service;

    long playerId;

    @BeforeEach
    void cleanSlate() {
        playerId = currentPlayer.id();
        jdbc.update("DELETE FROM garden_object");
        jdbc.update("DELETE FROM player_tile");
        jdbc.update("DELETE FROM inventory_item");
        clock.set(START);
    }

    @Test
    void plantingSpendsOneSeedAndShowsUpInState() throws Exception {
        give("seed_radish", 2);

        plant(3, 5, "seed_radish")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.speciesKey").value("radish"))
                .andExpect(jsonPath("$.stage").value(0))
                .andExpect(jsonPath("$.stageCount").value(3))
                .andExpect(jsonPath("$.mature").value(false));

        assertThat(quantity("seed_radish")).isEqualTo(1);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.garden.objects", hasSize(1)))
                .andExpect(jsonPath("$.garden.objects[0].x").value(3))
                .andExpect(jsonPath("$.garden.objects[0].y").value(5));
    }

    @Test
    void plantGrowsWithTimeAndNeverWithers() throws Exception {
        give("seed_radish", 1);
        plant(2, 5, "seed_radish").andExpect(status().isCreated());

        clock.advance(Duration.ofMinutes(10));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.garden.objects[0].stage").value(1));

        clock.advance(Duration.ofMinutes(30));
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.garden.objects[0].stage").value(2))
                .andExpect(jsonPath("$.garden.objects[0].mature").value(true));

        clock.advance(Duration.ofDays(60)); // долго не заходили — ничего не случилось
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.garden.objects[0].mature").value(true));
    }

    @Test
    void occupiedBedIsRejectedAndSeedIsKept() throws Exception {
        give("seed_radish", 2);
        plant(4, 6, "seed_radish").andExpect(status().isCreated());

        plant(4, 6, "seed_radish")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("На этой грядке уже что-то растёт."));

        assertThat(quantity("seed_radish")).isEqualTo(1);
    }

    @Test
    void onlyBedsArePlantable() throws Exception {
        give("seed_radish", 10);

        plant(2, 1, "seed_radish").andExpect(status().isBadRequest())   // сухая трава
                .andExpect(jsonPath("$.detail").value("«Сухая трава» — не грядка. Сажать можно только на грядку."));
        plant(2, 2, "seed_radish").andExpect(status().isBadRequest());  // заросшая грядка
        plant(0, 0, "seed_radish").andExpect(status().isBadRequest());  // забор
        plant(12, 2, "seed_radish").andExpect(status().isBadRequest())  // сарай
                .andExpect(jsonPath("$.detail").value("Здесь стоит «Старый сарай». Сажать можно только на грядку."));
        plant(16, 0, "seed_radish").andExpect(status().isBadRequest()); // за краем карты
        plant(-1, 5, "seed_radish").andExpect(status().isBadRequest());

        assertThat(quantity("seed_radish")).isEqualTo(10);
    }

    @Test
    void cannotPlantWithoutSeeds() throws Exception {
        plant(3, 5, "seed_sunflower")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Не хватает: «Пакетик семян подсолнуха». Нужно 1, есть 0."));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM garden_object", Integer.class)).isZero();
    }

    @Test
    void onlySeedsCanBePlanted() throws Exception {
        give("shard_emerald", 1);
        give("life_seed", 5);
        plant(3, 5, "shard_emerald").andExpect(status().isBadRequest());
        plant(3, 5, "life_seed").andExpect(status().isBadRequest());
        plant(3, 5, "seed_mystery").andExpect(status().isBadRequest());
    }

    @Test
    void parallelPlantingIntoOneBedPlantsOnceAndSpendsOneSeed() throws Exception {
        give("seed_chamomile", 5);

        ExecutorService pool = Executors.newFixedThreadPool(8);
        long planted;
        try {
            List<Callable<Boolean>> attempts = IntStream.range(0, 10).<Callable<Boolean>>mapToObj(i -> () -> {
                try {
                    service.plant(playerId, 5, 5, "seed_chamomile");
                    return true;
                } catch (Exception rejected) {
                    return false;
                }
            }).toList();
            planted = pool.invokeAll(attempts).stream().filter(f -> {
                try {
                    return f.get();
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            }).count();
        } finally {
            pool.shutdownNow();
        }

        assertThat(planted).isEqualTo(1);
        assertThat(quantity("seed_chamomile")).isEqualTo(4);
    }

    @Test
    void weedingNeedsToolsAndTurnsOvergrownBedIntoSoil() throws Exception {
        weed(2, 2)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Голыми руками эти сорняки не взять. Лопата и грабли висят на заборе."));

        give("garden_tools", 1);
        weed(2, 2).andExpect(status().isCreated()).andExpect(jsonPath("$.remaining").value(11));
        weed(2, 2).andExpect(status().isConflict());
        assertThat(quantity("garden_tools")).isEqualTo(1); // инструменты не тратятся

        // прополотая клетка — уже обычная грядка
        give("seed_radish", 1);
        plant(2, 2, "seed_radish").andExpect(status().isCreated());
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.garden.weeded", hasSize(1)))
                .andExpect(jsonPath("$.garden.weeded[0].x").value(2));
    }

    @Test
    void onlyOvergrownBedsCanBeWeeded() throws Exception {
        give("garden_tools", 1);
        weed(3, 5).andExpect(status().isBadRequest());  // обычная грядка
        weed(2, 1).andExpect(status().isBadRequest());  // трава
        weed(16, 2).andExpect(status().isBadRequest()); // за краем карты
    }

    private ResultActions weed(int x, int y) throws Exception {
        return mvc.perform(post("/api/garden/weedings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"x\":" + x + ",\"y\":" + y + "}"));
    }

    private ResultActions plant(int x, int y, String seed) throws Exception {
        return mvc.perform(post("/api/garden/plantings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"x\":" + x + ",\"y\":" + y + ",\"seedItemKey\":\"" + seed + "\"}"));
    }

    private void give(String itemKey, int quantity) {
        jdbc.update("INSERT INTO inventory_item (player_id, item_key, quantity) VALUES (?, ?, ?)",
                playerId, itemKey, quantity);
    }

    private int quantity(String itemKey) {
        List<Integer> rows = jdbc.queryForList(
                "SELECT quantity FROM inventory_item WHERE player_id = ? AND item_key = ?",
                Integer.class, playerId, itemKey);
        return rows.isEmpty() ? 0 : rows.get(0);
    }
}
