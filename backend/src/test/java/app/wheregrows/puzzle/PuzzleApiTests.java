package app.wheregrows.puzzle;

import java.util.List;

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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Замок на ящике в сарае: ответ — капля, солнце, луна (подсказка в письме). */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=puzzle-test")
@AutoConfigureMockMvc
class PuzzleApiTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer currentPlayer;

    long playerId;

    @BeforeEach
    void freshStart() {
        playerId = currentPlayer.id();
        jdbc.update("DELETE FROM player_puzzle");
        jdbc.update("DELETE FROM player_world_object");
        jdbc.update("DELETE FROM inventory_item");
    }

    @Test
    void catalogShowsTheLockButNotTheAnswer() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(jsonPath("$.puzzles", hasSize(3)))
                .andExpect(jsonPath("$.puzzles[?(@.key == 'toolbox_lock')].propKey").value("toolbox"))
                .andExpect(jsonPath("$.puzzles[?(@.key == 'toolbox_lock')].dials").value(3))
                .andExpect(jsonPath("$.puzzles[?(@.key == 'season_box')].dials").value(4))
                .andExpect(jsonPath("$.puzzles[*].answer").isEmpty());
    }

    @Test
    void wrongCombinationCostsNothing() throws Exception {
        attempt("sun", "drop", "moon")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solved").value(false))
                .andExpect(jsonPath("$.reward").isEmpty());
        assertThat(quantity("repair_kit")).isZero();
    }

    @Test
    void combinationMustFitTheLock() throws Exception {
        attempt("drop", "sun").andExpect(status().isBadRequest());
        attempt("drop", "sun", "star").andExpect(status().isBadRequest());
    }

    @Test
    void rightCombinationOpensTheBoxOnce() throws Exception {
        attempt("drop", "sun", "moon")
                .andExpect(jsonPath("$.solved").value(true))
                .andExpect(jsonPath("$.reward[0].itemKey").value("repair_kit"));
        attempt("drop", "sun", "moon")
                .andExpect(jsonPath("$.solved").value(true))
                .andExpect(jsonPath("$.reward").isEmpty());
        assertThat(quantity("repair_kit")).isEqualTo(1);
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.solvedPuzzles[0]").value("toolbox_lock"));
    }

    @Test
    void musicBoxGivesALilyBulbThatCanBePlanted() throws Exception {
        mvc.perform(post("/api/puzzles/season_box/attempts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answer\":[\"drop\",\"sun\",\"leaf\",\"moon\"]}"))
                .andExpect(jsonPath("$.solved").value(true))
                .andExpect(jsonPath("$.reward[0].itemKey").value("seed_lily"));
        assertThat(quantity("seed_lily")).isEqualTo(1);
    }

    @Test
    void repairKitFixesTheWheelbarrow() throws Exception {
        attempt("drop", "sun", "moon");
        mvc.perform(post("/api/magic/recipes/repair_wheelbarrow/cast"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.objectKey").value("wheelbarrow"));
        assertThat(quantity("repair_kit")).isZero();
    }

    private ResultActions attempt(String... answer) throws Exception {
        String json = String.join("\",\"", answer);
        return mvc.perform(post("/api/puzzles/toolbox_lock/attempts").contentType(MediaType.APPLICATION_JSON)
                .content("{\"answer\":[\"" + json + "\"]}"));
    }

    private int quantity(String itemKey) {
        List<Integer> rows = jdbc.queryForList(
                "SELECT quantity FROM inventory_item WHERE player_id = ? AND item_key = ?",
                Integer.class, playerId, itemKey);
        return rows.isEmpty() ? 0 : rows.get(0);
    }
}
