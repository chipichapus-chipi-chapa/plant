package app.wheregrows.magic;

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

/** Рецепт «Пробуждение каменной чаши»: 2 осколка изумруда + 1 осколок аметиста. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=magic-test")
@AutoConfigureMockMvc
class MagicApiTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer currentPlayer;

    @Autowired
    MagicService service;

    long playerId;

    @BeforeEach
    void cleanSlate() {
        playerId = currentPlayer.id();
        jdbc.update("DELETE FROM player_world_object");
        jdbc.update("DELETE FROM inventory_item");
    }

    @Test
    void catalogDescribesRecipeWithIngredients() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(jsonPath("$.recipes[0].key").value("awaken_basin"))
                .andExpect(jsonPath("$.recipes[0].targetObjectKey").value("stone-basin"))
                .andExpect(jsonPath("$.recipes[0].ingredients", hasSize(2)))
                .andExpect(jsonPath("$.recipes[1].key").value("open_east_gate"))
                .andExpect(jsonPath("$.garden.props[?(@.key == 'stone-basin')].kind").value("basin"));
    }

    @Test
    void castingSpendsIngredientsAndAwakensObjectForGood() throws Exception {
        give("shard_emerald", 3);
        give("shard_amethyst", 1);

        cast("awaken_basin")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.objectKey").value("stone-basin"))
                .andExpect(jsonPath("$.state").value("AWAKENED"))
                .andExpect(jsonPath("$.spent", hasSize(2)));

        assertThat(quantity("shard_emerald")).isEqualTo(1);
        assertThat(quantity("shard_amethyst")).isZero();
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.worldObjects", hasSize(1)))
                .andExpect(jsonPath("$.worldObjects[0].objectKey").value("stone-basin"))
                .andExpect(jsonPath("$.worldObjects[0].state").value("AWAKENED"));
    }

    @Test
    void missingIngredientsAreListedAndNothingIsSpent() throws Exception {
        give("shard_emerald", 2);

        cast("awaken_basin")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        "Пока не хватает: Осколок аметиста (нужно 1, есть 0). Ничего не потрачено."));

        assertThat(quantity("shard_emerald")).isEqualTo(2);
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.worldObjects").isEmpty());
    }

    @Test
    void awakenedObjectCannotBeAwakenedAgain() throws Exception {
        give("shard_emerald", 4);
        give("shard_amethyst", 2);
        cast("awaken_basin").andExpect(status().isCreated());

        cast("awaken_basin")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Здесь уже всё сделано: «Каменная чаша». Повторно тратить ничего не нужно."));

        assertThat(quantity("shard_emerald")).isEqualTo(2);
        assertThat(quantity("shard_amethyst")).isEqualTo(1);
    }

    @Test
    void unknownRecipeIsNotFound() throws Exception {
        cast("summon_dragon").andExpect(status().isNotFound());
    }

    @Test
    void parallelCastsSpendOnce() throws Exception {
        give("shard_emerald", 10);
        give("shard_amethyst", 5);

        ExecutorService pool = Executors.newFixedThreadPool(8);
        long succeeded;
        try {
            List<Callable<Boolean>> attempts = IntStream.range(0, 8).<Callable<Boolean>>mapToObj(i -> () -> {
                try {
                    service.cast(playerId, "awaken_basin");
                    return true;
                } catch (Exception rejected) {
                    return false;
                }
            }).toList();
            succeeded = pool.invokeAll(attempts).stream().filter(f -> {
                try {
                    return f.get();
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            }).count();
        } finally {
            pool.shutdownNow();
        }

        assertThat(succeeded).isEqualTo(1);
        assertThat(quantity("shard_emerald")).isEqualTo(8);
        assertThat(quantity("shard_amethyst")).isEqualTo(4);
    }

    private ResultActions cast(String recipe) throws Exception {
        return mvc.perform(post("/api/magic/recipes/{key}/cast", recipe));
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
