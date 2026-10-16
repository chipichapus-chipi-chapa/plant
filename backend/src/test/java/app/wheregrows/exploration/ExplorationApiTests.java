package app.wheregrows.exploration;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Исследование по контенту из R__content.sql:
 * rock_cache (камни) — осколки без условий; shed_corner (сарай) — нужен свет пробуждённой чаши,
 * даёт Солнечную искру и артефакт «Зерно первого сада».
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=explorer-test")
@AutoConfigureMockMvc
class ExplorationApiTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer currentPlayer;

    @Autowired
    ExplorationService service;

    long playerId;

    @BeforeEach
    void cleanSlate() {
        playerId = currentPlayer.id();
        jdbc.update("DELETE FROM player_discovery");
        jdbc.update("DELETE FROM player_artifact");
        jdbc.update("DELETE FROM player_world_object");
        jdbc.update("DELETE FROM inventory_item");
    }

    @Test
    void cacheIsFoundOnceAndThenEmpty() throws Exception {
        search("rock_cache")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("FOUND"))
                .andExpect(jsonPath("$.reward", hasSize(2)))
                .andExpect(jsonPath("$.artifact").doesNotExist());
        assertThat(quantity("shard_amethyst")).isEqualTo(2);
        assertThat(quantity("shard_emerald")).isEqualTo(1);

        search("rock_cache")
                .andExpect(jsonPath("$.outcome").value("EMPTY"))
                .andExpect(jsonPath("$.reward").isEmpty());
        assertThat(quantity("shard_amethyst")).isEqualTo(2);
    }

    @Test
    void shedIsDarkUntilBasinIsAwakenedAndDarknessCostsNothing() throws Exception {
        search("shed_corner")
                .andExpect(jsonPath("$.outcome").value("LOCKED"))
                .andExpect(jsonPath("$.text").value("В сарае темно, ничего не разглядеть. Вот бы сюда немного света…"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM player_discovery", Integer.class)).isZero();

        awakenBasin();

        search("shed_corner")
                .andExpect(jsonPath("$.outcome").value("FOUND"))
                .andExpect(jsonPath("$.reward[0].itemKey").value("sun_spark"))
                .andExpect(jsonPath("$.artifact.key").value("seed_of_first_garden"))
                .andExpect(jsonPath("$.artifact.name").value("Зерно первого сада"));

        assertThat(quantity("sun_spark")).isEqualTo(1);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.artifacts", hasSize(1)))
                .andExpect(jsonPath("$.artifacts[0].key").value("seed_of_first_garden"))
                .andExpect(jsonPath("$.artifacts[0].foundWhere").value("shed_corner"))
                .andExpect(jsonPath("$.searchedSpots[0]").value("shed_corner"));

        search("shed_corner").andExpect(jsonPath("$.outcome").value("EMPTY"));
        assertThat(quantity("sun_spark")).isEqualTo(1);
    }

    @Test
    void uniqueArtifactIsNeverDuplicated() throws Exception {
        jdbc.update("INSERT INTO player_artifact VALUES (?, 'seed_of_first_garden', now(), 'somewhere')", playerId);
        awakenBasin();

        search("shed_corner")
                .andExpect(jsonPath("$.outcome").value("FOUND"))
                .andExpect(jsonPath("$.artifact").doesNotExist());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM player_artifact", Integer.class)).isEqualTo(1);
        assertThat(quantity("sun_spark")).isEqualTo(1);
    }

    @Test
    void sunSparkOpensGateAndArtifactStaysInCollection() throws Exception {
        awakenBasin();
        search("shed_corner").andExpect(jsonPath("$.outcome").value("FOUND"));

        mvc.perform(post("/api/magic/recipes/{key}/cast", "open_east_gate"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.objectKey").value("east-gate"));

        assertThat(quantity("sun_spark")).isZero();
        assertThat(quantity("life_seed")).isZero(); // искры — отдельный ресурс, Семена жизни не тронуты
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.artifacts", hasSize(1)));
    }

    @Test
    void unknownSpotIsNotFound() throws Exception {
        search("dragon_lair").andExpect(status().isNotFound());
    }

    @Test
    void parallelSearchesRewardOnce() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        long found;
        try {
            List<Callable<SearchResult.Outcome>> attempts = IntStream.range(0, 10)
                    .<Callable<SearchResult.Outcome>>mapToObj(i -> () -> service.search(playerId, "rock_cache").outcome())
                    .toList();
            found = pool.invokeAll(attempts).stream().filter(f -> {
                try {
                    return f.get() == SearchResult.Outcome.FOUND;
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            }).count();
        } finally {
            pool.shutdownNow();
        }

        assertThat(found).isEqualTo(1);
        assertThat(quantity("shard_amethyst")).isEqualTo(2);
    }

    @Test
    void catalogListsArtifactsAndSpotsWithoutRevealingTheirContents() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(jsonPath("$.artifacts", hasSize(3)))
                .andExpect(jsonPath("$.artifacts[0].acquisitionHint").value("Ищите там, куда падает свет пробуждённой чаши."))
                .andExpect(jsonPath("$.spots", hasSize(3)))
                .andExpect(jsonPath("$.spots[0].reward").doesNotExist());
    }

    private void awakenBasin() {
        jdbc.update("INSERT INTO player_world_object VALUES (?, 'stone-basin', 'AWAKENED', now())", playerId);
    }

    private ResultActions search(String spot) throws Exception {
        return mvc.perform(post("/api/exploration/spots/{key}/search", spot));
    }

    private int quantity(String itemKey) {
        List<Integer> rows = jdbc.queryForList(
                "SELECT quantity FROM inventory_item WHERE player_id = ? AND item_key = ?",
                Integer.class, playerId, itemKey);
        return rows.isEmpty() ? 0 : rows.get(0);
    }
}
