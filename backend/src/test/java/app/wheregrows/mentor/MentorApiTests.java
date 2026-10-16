package app.wheregrows.mentor;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Мастер Вереск по контенту content/mentor/vereshk.json. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=mentor-test")
@AutoConfigureMockMvc
class MentorApiTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer currentPlayer;

    @Autowired
    MentorService service;

    long playerId;

    @BeforeEach
    void freshStart() {
        playerId = currentPlayer.id();
        for (String table : List.of("player_flag", "habit_completion", "habit", "garden_object", "player_discovery",
                "player_world_object", "player_tile", "inventory_item")) {
            jdbc.update("DELETE FROM " + table);
        }
    }

    @Test
    void firstTalkIsIntroWithNewsAndGift() throws Exception {
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("intro"))
                .andExpect(jsonPath("$.mentor.hasNews").value(true));

        finish("intro")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flag").value("met_vereshk"))
                .andExpect(jsonPath("$.gift[0].itemKey").value("seed_radish"));
        assertThat(quantity("seed_radish")).isEqualTo(1);

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("hint_create_habit"))
                .andExpect(jsonPath("$.mentor.hasNews").value(false));
    }

    @Test
    void introGiftIsGivenOnlyOnce() throws Exception {
        finish("intro").andExpect(status().isOk());
        finish("intro").andExpect(status().isConflict());
        assertThat(quantity("seed_radish")).isEqualTo(1);
    }

    @Test
    void stepIsAcknowledgedOnlyAfterItIsReallyDone() throws Exception {
        finish("intro");
        finish("done_create_habit")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Вереск сейчас о другом."));

        jdbc.update("INSERT INTO habit (player_id, title) VALUES (?, 'Читать')", playerId);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("done_create_habit"))
                .andExpect(jsonPath("$.mentor.hasNews").value(true))
                .andExpect(jsonPath("$.mentor.steps[0].done").value(true))
                .andExpect(jsonPath("$.mentor.steps[0].acknowledged").value(false));

        finish("done_create_habit").andExpect(jsonPath("$.flag").value("ack_create_habit"));
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("hint_earn_reward"))
                .andExpect(jsonPath("$.mentor.steps[0].acknowledged").value(true));
    }

    @Test
    void stepsDoneOutOfOrderAreAcknowledgedInOrder() throws Exception {
        finish("intro");
        jdbc.update("INSERT INTO garden_object (player_id, x, y, kind, species_key, planted_at) "
                + "VALUES (?, 3, 5, 'PLANT', 'radish', now())", playerId);

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.steps[2].done").value(true))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("hint_create_habit"));
    }

    @Test
    void afterTutorialVereshkOffersTheWeedingErrand() throws Exception {
        finishTutorial();

        // поручение даёт сам Вереск: над ним «!», пока разговор не состоялся
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("offer_tools"))
                .andExpect(jsonPath("$.mentor.hasNews").value(true))
                .andExpect(jsonPath("$.mentor.steps[4].offered").value(false));
        finish("offer_tools").andExpect(jsonPath("$.flag").value("offered_take_tools"));
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("hint_take_tools"))
                .andExpect(jsonPath("$.mentor.hasNews").value(false));

        jdbc.update("INSERT INTO player_discovery VALUES (?, 'fence_tools', now())", playerId);
        finish("done_take_tools").andExpect(status().isOk());
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.mentor.nextDialogue").value("hint_weed"));

        // все заросшие клетки домашнего сада — два ряда по шесть
        jdbc.update("INSERT INTO player_tile SELECT ?, 'home', x, y, 'WEEDED', now() "
                + "FROM generate_series(2, 7) AS x, generate_series(2, 3) AS y", playerId);
        finish("done_weed")
                .andExpect(jsonPath("$.gift[0].itemKey").value("life_seed"))
                .andExpect(jsonPath("$.gift[1].itemKey").value("seed_chamomile"));
        assertThat(quantity("seed_chamomile")).isEqualTo(2);

        // дальше — следующее поручение: починить тачку
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("offer_repair"))
                .andExpect(jsonPath("$.mentor.hasNews").value(true));
        finish("idle_rest").andExpect(status().isOk()).andExpect(jsonPath("$.gift").isEmpty());
    }

    @Test
    void gardenErrandsFollowRealProgress() throws Exception {
        finishTutorial();
        jdbc.update("INSERT INTO player_flag SELECT ?, f, now() FROM unnest(ARRAY["
                + "'ack_take_tools','ack_weed','offered_repair']) AS f", playerId);
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.mentor.nextDialogue").value("hint_repair"));

        // тачка починена → благодарность с подарком
        jdbc.update("INSERT INTO player_world_object VALUES (?, 'wheelbarrow', 'AWAKENED', now())", playerId);
        finish("done_repair").andExpect(jsonPath("$.gift[0].itemKey").value("seed_sunflower"));

        // бочка уже наполнена до поручения — Вереск сразу благодарит, поручение не нужно
        jdbc.update("INSERT INTO player_world_object VALUES (?, 'barrel', 'AWAKENED', now())", playerId);
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("done_barrel"))
                .andExpect(jsonPath("$.mentor.hasNews").value(true));
        finish("done_barrel").andExpect(status().isOk());

        // подсолнух: только что посаженный не считается, выросший — считается
        finish("offer_sunflower");
        jdbc.update("INSERT INTO garden_object (player_id, x, y, kind, species_key, planted_at) "
                + "VALUES (?, 3, 5, 'PLANT', 'sunflower', now())", playerId);
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.mentor.nextDialogue").value("hint_sunflower"));
        jdbc.update("UPDATE garden_object SET planted_at = now() - interval '11 hours' WHERE player_id = ?", playerId);
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.mentor.nextDialogue").value("done_sunflower"));
    }

    @Test
    void errandAlreadyDoneIsThankedRightAway() throws Exception {
        finishTutorial();
        jdbc.update("INSERT INTO player_discovery VALUES (?, 'fence_tools', now())", playerId);

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.mentor.steps[4].done").value(true))
                .andExpect(jsonPath("$.mentor.nextDialogue").value("done_take_tools"));
        finish("offer_tools").andExpect(status().isConflict());
        finish("done_take_tools").andExpect(status().isOk());
    }

    private void finishTutorial() {
        jdbc.update("INSERT INTO player_flag SELECT ?, f, now() FROM unnest(ARRAY["
                + "'met_vereshk','ack_create_habit','ack_earn_reward','ack_plant','ack_inspect']) AS f", playerId);
    }

    @Test
    void smallTalkIsAlwaysAllowedAndUnknownIsNotFound() throws Exception {
        finish("idle_east").andExpect(status().isOk());
        finish("secret_ending").andExpect(status().isNotFound());
    }

    @Test
    void parallelFinishesGiveTheGiftOnce() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<Object>> calls = IntStream.range(0, 10).<Callable<Object>>mapToObj(i -> () -> {
                try {
                    return service.finish(playerId, "intro");
                } catch (Exception rejected) {
                    return rejected;
                }
            }).toList();
            pool.invokeAll(calls);
        } finally {
            pool.shutdownNow();
        }
        assertThat(quantity("seed_radish")).isEqualTo(1);
    }

    @Test
    void catalogCarriesDialogues() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(jsonPath("$.mentor.speaker.name").value("Мастер Вереск"))
                .andExpect(jsonPath("$.mentor.dialogues.intro.nodes.question.choices[1].next").value("lazy"))
                .andExpect(jsonPath("$.mentor.tutorial[0].target.hud").value("habits"))
                .andExpect(jsonPath("$.mentor.tutorial[3].target.prop").value("rock-2"));
    }

    private ResultActions finish(String dialogue) throws Exception {
        return mvc.perform(post("/api/mentor/dialogues/{key}/finish", dialogue));
    }

    private int quantity(String itemKey) {
        List<Integer> rows = jdbc.queryForList(
                "SELECT quantity FROM inventory_item WHERE player_id = ? AND item_key = ?",
                Integer.class, playerId, itemKey);
        return rows.isEmpty() ? 0 : rows.get(0);
    }
}
