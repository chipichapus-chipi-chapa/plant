package app.wheregrows.habit;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
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
import app.wheregrows.player.LocalPlayerProvisioner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Привычки и награды через настоящий HTTP-слой и настоящий PostgreSQL.
 * Дневной лимит наград уменьшен до 2, чтобы проверять его быстро.
 */
@Import({TestcontainersConfiguration.class, HabitApiTests.Clocks.class})
@SpringBootTest(properties = {
        "game.local.username=habit-test",
        "game.local.timezone=UTC",
        "game.rewards.daily-rewarded-completions=2",
        "game.habits.max-active=3"})
@AutoConfigureMockMvc
class HabitApiTests {

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
    HabitService service;

    @Autowired
    CurrentPlayer currentPlayer;

    @Autowired
    LocalPlayerProvisioner provisioner;

    @BeforeEach
    void cleanSlate() {
        jdbc.update("DELETE FROM habit_completion");
        jdbc.update("DELETE FROM habit");
        jdbc.update("DELETE FROM inventory_item");
        clock.set(START);
    }

    // --- Создание и изменение ---------------------------------------------------

    @Test
    void createsHabitWithCrystalCategory() throws Exception {
        createHabit("  Читать   книгу ", "emerald")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Читать книгу"))
                .andExpect(jsonPath("$.crystalCategory").value("emerald"))
                .andExpect(jsonPath("$.doneToday").value(false));

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.habits", hasSize(1)))
                .andExpect(jsonPath("$.habits[0].title").value("Читать книгу"));
    }

    @Test
    void rejectsBlankTitleWithReadableMessage() throws Exception {
        createHabit("   ", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Проверьте данные"))
                .andExpect(jsonPath("$.detail").value("Назовите привычку."))
                .andExpect(jsonPath("$.errors.title").value("Назовите привычку."));
    }

    @Test
    void rejectsTooLongTitle() throws Exception {
        createHabit("а".repeat(61), null).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsUnknownCrystalCategory() throws Exception {
        createHabit("Гулять", "diamond")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Неизвестная категория кристалла: diamond."));
    }

    @Test
    void rejectsDuplicateActiveTitleIgnoringCase() throws Exception {
        createHabit("Гулять", null).andExpect(status().isCreated());
        createHabit("гулять", "sapphire").andExpect(status().isConflict());
    }

    @Test
    void archivedTitleCanBeReused() throws Exception {
        long id = createdId(createHabit("Гулять", null));
        mvc.perform(delete("/api/habits/{id}", id)).andExpect(status().isNoContent());
        createHabit("Гулять", null).andExpect(status().isCreated());
    }

    @Test
    void limitsNumberOfActiveHabits() throws Exception {
        for (String title : List.of("Раз", "Два", "Три")) {
            createHabit(title, null).andExpect(status().isCreated());
        }
        createHabit("Четыре", null).andExpect(status().isConflict());
    }

    @Test
    void updatesTitleAndClearsCategory() throws Exception {
        long id = createdId(createHabit("Рисовать", "amethyst"));

        mvc.perform(put("/api/habits/{id}", id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Рисовать скетчи\",\"crystalCategory\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Рисовать скетчи"))
                .andExpect(jsonPath("$.crystalCategory").doesNotExist());
    }

    @Test
    void archivedHabitDisappearsButKeepsEarnedRewards() throws Exception {
        long id = createdId(createHabit("Готовить", "amber"));
        complete(id).andExpect(status().isCreated());

        mvc.perform(delete("/api/habits/{id}", id)).andExpect(status().isNoContent());

        mvc.perform(get("/api/state")).andExpect(jsonPath("$.habits").isEmpty());
        assertThat(quantity("life_seed")).isEqualTo(3);
        assertThat(quantity("shard_amber")).isEqualTo(1);
        complete(id).andExpect(status().isNotFound());
    }

    @Test
    void cannotTouchAnotherPlayersHabit() throws Exception {
        long strangerId = provisioner.provision("stranger", "Чужой", java.time.ZoneId.of("UTC"));
        long strangersHabit = jdbc.queryForObject(
                "INSERT INTO habit (player_id, title) VALUES (?, 'Секрет') RETURNING id", Long.class, strangerId);

        complete(strangersHabit).andExpect(status().isNotFound());
        mvc.perform(delete("/api/habits/{id}", strangersHabit)).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM habit_completion", Integer.class)).isZero();
    }

    // --- Отметка и награды ---------------------------------------------------------

    @Test
    void completionGrantsLifeSeedsAndShardOfHabitCategory() throws Exception {
        long id = createdId(createHabit("Учить Java", "emerald"));

        complete(id)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.newlyCompleted").value(true))
                .andExpect(jsonPath("$.day").value("2026-10-15"))
                .andExpect(jsonPath("$.reward", hasSize(2)))
                .andExpect(jsonPath("$.reward[0].itemKey").value("life_seed"))
                .andExpect(jsonPath("$.reward[0].quantity").value(3))
                .andExpect(jsonPath("$.reward[1].itemKey").value("shard_emerald"))
                .andExpect(jsonPath("$.reward[1].quantity").value(1));

        assertThat(quantity("life_seed")).isEqualTo(3);
        assertThat(quantity("shard_emerald")).isEqualTo(1);
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.habits[0].doneToday").value(true));
    }

    @Test
    void habitWithoutCategoryGivesOnlyLifeSeeds() throws Exception {
        long id = createdId(createHabit("Пить воду", null));

        complete(id).andExpect(jsonPath("$.reward", hasSize(1)));

        assertThat(quantity("life_seed")).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM inventory_item WHERE item_key LIKE 'shard_%'",
                Integer.class)).isZero();
    }

    @Test
    void repeatedCompletionTheSameDayDoesNotRewardAgain() throws Exception {
        long id = createdId(createHabit("Гулять", "sapphire"));

        complete(id).andExpect(status().isCreated());
        complete(id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newlyCompleted").value(false))
                .andExpect(jsonPath("$.reward").isEmpty());

        assertThat(quantity("life_seed")).isEqualTo(3);
        assertThat(quantity("shard_sapphire")).isEqualTo(1);
    }

    @Test
    void parallelCompletionsRewardExactlyOnce() throws Exception {
        long id = createdId(createHabit("Гулять", "sapphire"));
        long playerId = currentPlayer.id();

        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<CompletionResult>> calls = IntStream.range(0, 16)
                    .<Callable<CompletionResult>>mapToObj(i -> () -> service.completeToday(playerId, id))
                    .toList();
            long created = 0;
            for (Future<CompletionResult> future : pool.invokeAll(calls)) {
                if (future.get().newlyCompleted()) {
                    created++;
                }
            }
            assertThat(created).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }

        assertThat(jdbc.queryForObject("SELECT count(*) FROM habit_completion", Integer.class)).isEqualTo(1);
        assertThat(quantity("life_seed")).isEqualTo(3);
        assertThat(quantity("shard_sapphire")).isEqualTo(1);
    }

    @Test
    void nextDayTheHabitCanBeCompletedAgain() throws Exception {
        long id = createdId(createHabit("Гулять", "sapphire"));
        complete(id).andExpect(status().isCreated());

        clock.advance(Duration.ofDays(1));

        complete(id)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.day").value("2026-10-16"));
        assertThat(quantity("life_seed")).isEqualTo(6);
        assertThat(quantity("shard_sapphire")).isEqualTo(2);
    }

    @Test
    void skippedDaysCostNothing() throws Exception {
        long id = createdId(createHabit("Гулять", "sapphire"));
        complete(id);

        clock.advance(Duration.ofDays(10));

        assertThat(quantity("life_seed")).isEqualTo(3);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.habits[0].doneToday").value(false))
                .andExpect(jsonPath("$.dailyRewards.used").value(0));
    }

    @Test
    void completionsBeyondDailyLimitCountButGiveNoReward() throws Exception {
        long first = createdId(createHabit("Раз", "ruby"));
        long second = createdId(createHabit("Два", "ruby"));
        long third = createdId(createHabit("Три", "ruby"));

        complete(first).andExpect(jsonPath("$.dailyLimitReached").value(false));
        complete(second).andExpect(jsonPath("$.dailyLimitReached").value(false));
        complete(third)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dailyLimitReached").value(true))
                .andExpect(jsonPath("$.reward").isEmpty());

        assertThat(quantity("life_seed")).isEqualTo(6);
        assertThat(quantity("shard_ruby")).isEqualTo(2);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.habits[2].doneToday").value(true))
                .andExpect(jsonPath("$.dailyRewards.used").value(2))
                .andExpect(jsonPath("$.dailyRewards.limit").value(2));
    }

    @Test
    void stateShowsBalancesAfterRewards() throws Exception {
        long id = createdId(createHabit("Звонить маме", "rose"));
        complete(id);

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.inventory[?(@.itemKey == 'life_seed')].quantity").value(3))
                .andExpect(jsonPath("$.inventory[?(@.itemKey == 'shard_rose')].quantity").value(1));
    }

    // --- Вспомогательное ---------------------------------------------------------------

    private ResultActions createHabit(String title, String category) throws Exception {
        String categoryJson = category == null ? "null" : "\"" + category + "\"";
        return mvc.perform(post("/api/habits").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"" + title + "\",\"crystalCategory\":" + categoryJson + "}"));
    }

    private ResultActions complete(long habitId) throws Exception {
        return mvc.perform(put("/api/habits/{id}/completions/today", habitId));
    }

    private long createdId(ResultActions result) throws Exception {
        String body = result.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll(".*\"id\":(\\d+).*", "$1"));
    }

    private int quantity(String itemKey) {
        List<Integer> rows = jdbc.queryForList(
                "SELECT quantity FROM inventory_item WHERE player_id = ? AND item_key = ?",
                Integer.class, currentPlayer.id(), itemKey);
        return rows.isEmpty() ? 0 : rows.get(0);
    }
}
