package app.wheregrows.shop;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import app.wheregrows.TestcontainersConfiguration;
import app.wheregrows.player.CurrentPlayer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Лавка: списание Семян жизни, нехватка, идемпотентность и параллельные покупки. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=shop-test")
@AutoConfigureMockMvc
class ShopApiTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer currentPlayer;

    @Autowired
    ShopService service;

    long playerId;

    @BeforeEach
    void cleanSlate() {
        playerId = currentPlayer.id();
        jdbc.update("DELETE FROM shop_purchase");
        jdbc.update("DELETE FROM inventory_item");
    }

    @Test
    void purchaseSpendsLifeSeedsAndAddsItem() throws Exception {
        giveLifeSeeds(10);

        buy(UUID.randomUUID(), "seed_radish", 2)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cost").value(4))
                .andExpect(jsonPath("$.replayed").value(false));

        assertThat(quantity("life_seed")).isEqualTo(6);
        assertThat(quantity("seed_radish")).isEqualTo(2);
    }

    @Test
    void notEnoughLifeSeedsChangesNothing() throws Exception {
        giveLifeSeeds(3);

        buy(UUID.randomUUID(), "seed_sunflower", 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Не хватает: «Семена жизни». Нужно 5, есть 3."));

        assertThat(quantity("life_seed")).isEqualTo(3);
        assertThat(quantity("seed_sunflower")).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM shop_purchase", Integer.class)).isZero();
    }

    @Test
    void emptyPocketsAreReportedAsZero() throws Exception {
        buy(UUID.randomUUID(), "seed_radish", 1)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Не хватает: «Семена жизни». Нужно 2, есть 0."));
    }

    @Test
    void itemsWithoutPriceAreNotForSale() throws Exception {
        giveLifeSeeds(100);
        buy(UUID.randomUUID(), "shard_emerald", 1).andExpect(status().isBadRequest());
        buy(UUID.randomUUID(), "life_seed", 1).andExpect(status().isBadRequest());
        assertThat(quantity("life_seed")).isEqualTo(100);
    }

    @Test
    void townFlowersAreSoldOnlyAfterLizasErrand() throws Exception {
        giveLifeSeeds(100);
        jdbc.update("DELETE FROM player_flag WHERE player_id = ? AND flag LIKE 'errand_done:liza_irises'", playerId);

        buy(UUID.randomUUID(), "seed_iris", 1).andExpect(status().isConflict());
        assertThat(quantity("life_seed")).isEqualTo(100);

        jdbc.update("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, 'errand_done:liza_irises', now())", playerId);
        buy(UUID.randomUUID(), "seed_iris", 1).andExpect(status().isCreated());
        assertThat(quantity("seed_iris")).isEqualTo(1);
        jdbc.update("DELETE FROM player_flag WHERE player_id = ? AND flag = 'errand_done:liza_irises'", playerId);
    }

    @Test
    void unknownItemIsNotFound() throws Exception {
        giveLifeSeeds(100);
        buy(UUID.randomUUID(), "seed_dragonfruit", 1).andExpect(status().isNotFound());
    }

    @Test
    void quantityMustBeReasonable() throws Exception {
        giveLifeSeeds(100);
        buy(UUID.randomUUID(), "seed_radish", 0).andExpect(status().isBadRequest());
        buy(UUID.randomUUID(), "seed_radish", 21).andExpect(status().isBadRequest());
        assertThat(quantity("life_seed")).isEqualTo(100);
    }

    @Test
    void idempotencyKeyIsRequired() throws Exception {
        giveLifeSeeds(10);
        mvc.perform(post("/api/shop/purchases").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemKey\":\"seed_radish\",\"quantity\":1}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/shop/purchases").header("Idempotency-Key", "not-a-uuid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemKey\":\"seed_radish\",\"quantity\":1}"))
                .andExpect(status().isBadRequest());
        assertThat(quantity("life_seed")).isEqualTo(10);
    }

    @Test
    void repeatedRequestWithSameKeyChargesOnce() throws Exception {
        giveLifeSeeds(10);
        UUID key = UUID.randomUUID();

        buy(key, "seed_chamomile", 1).andExpect(status().isCreated());
        buy(key, "seed_chamomile", 1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replayed").value(true))
                .andExpect(jsonPath("$.cost").value(3));

        assertThat(quantity("life_seed")).isEqualTo(7);
        assertThat(quantity("seed_chamomile")).isEqualTo(1);
    }

    @Test
    void sameKeyForDifferentItemIsRejected() throws Exception {
        giveLifeSeeds(10);
        UUID key = UUID.randomUUID();
        buy(key, "seed_radish", 1).andExpect(status().isCreated());

        buy(key, "seed_sunflower", 1).andExpect(status().isConflict());

        assertThat(quantity("life_seed")).isEqualTo(8);
        assertThat(quantity("seed_sunflower")).isZero();
    }

    @Test
    void parallelRetriesOfOnePurchaseChargeOnce() throws Exception {
        giveLifeSeeds(10);
        UUID key = UUID.randomUUID();

        List<PurchaseResult> results = runInParallel(16, () -> service.purchase(playerId, key, "seed_radish", 1));

        assertThat(results.stream().filter(r -> !r.replayed()).count()).isEqualTo(1);
        assertThat(quantity("life_seed")).isEqualTo(8);
        assertThat(quantity("seed_radish")).isEqualTo(1);
    }

    @Test
    void parallelDifferentPurchasesNeverOverspend() throws Exception {
        giveLifeSeeds(10); // хватает ровно на 5 редисов по 2

        List<Callable<Boolean>> attempts = IntStream.range(0, 12)
                .<Callable<Boolean>>mapToObj(i -> () -> {
                    try {
                        service.purchase(playerId, UUID.randomUUID(), "seed_radish", 1);
                        return true;
                    } catch (Exception notEnough) {
                        return false;
                    }
                })
                .toList();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        long succeeded;
        try {
            succeeded = pool.invokeAll(attempts).stream().filter(ShopApiTests::get).count();
        } finally {
            pool.shutdownNow();
        }

        assertThat(succeeded).isEqualTo(5);
        assertThat(quantity("life_seed")).isZero();
        assertThat(quantity("seed_radish")).isEqualTo(5);
    }

    // --- Вспомогательное ---------------------------------------------------------------

    private ResultActions buy(UUID key, String itemKey, int quantity) throws Exception {
        return mvc.perform(post("/api/shop/purchases")
                .header("Idempotency-Key", key.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"itemKey\":\"" + itemKey + "\",\"quantity\":" + quantity + "}"));
    }

    private void giveLifeSeeds(int amount) {
        jdbc.update("INSERT INTO inventory_item (player_id, item_key, quantity) VALUES (?, 'life_seed', ?)",
                playerId, amount);
    }

    private int quantity(String itemKey) {
        List<Integer> rows = jdbc.queryForList(
                "SELECT quantity FROM inventory_item WHERE player_id = ? AND item_key = ?",
                Integer.class, playerId, itemKey);
        return rows.isEmpty() ? 0 : rows.get(0);
    }

    private static <T> List<T> runInParallel(int times, Callable<T> task) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            return pool.invokeAll(IntStream.range(0, times).mapToObj(i -> task).toList())
                    .stream().map(ShopApiTests::get).toList();
        } finally {
            pool.shutdownNow();
        }
    }

    private static <T> T get(Future<T> future) {
        try {
            return future.get();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
