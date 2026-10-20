package app.wheregrows.testing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import app.wheregrows.TestcontainersConfiguration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Кнопки тестирования в локальном режиме: доступны, меняют только свой сад. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=tools-test")
@AutoConfigureMockMvc
class TestToolsApiTests {

    @Autowired
    MockMvc mvc;

    @BeforeEach
    void freshGame() throws Exception {
        mvc.perform(post("/api/test/reset")).andExpect(status().isNoContent());
    }

    @Test
    void localPlayerIsATester() throws Exception {
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.tester").value(true));
    }

    @Test
    void resourcesFillTheBag() throws Exception {
        mvc.perform(post("/api/test/resources")).andExpect(status().isNoContent());

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.inventory[?(@.itemKey == 'life_seed')].quantity").value(100))
                .andExpect(jsonPath("$.inventory[?(@.itemKey == 'seed_lily')].quantity").value(5))
                .andExpect(jsonPath("$.inventory[?(@.itemKey == 'shard_rose')].quantity").value(5));
    }

    @Test
    void openPathsWakesTheManorAndStartsTheFog() throws Exception {
        mvc.perform(post("/api/test/open-paths")).andExpect(status().isNoContent());

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.errands[?(@.key == 'khmur_toll')].done").value(true))
                .andExpect(jsonPath("$.errands[?(@.key == 'myata_garden')].done").value(true))
                .andExpect(jsonPath("$.worldObjects[?(@.objectKey == 'lily-west')]").exists())
                .andExpect(jsonPath("$.worldObjects[?(@.objectKey == 'east-gate')]").exists())
                .andExpect(jsonPath("$.fog.started").value(true))
                .andExpect(jsonPath("$.fog.days").value(0))
                // к плотине — очаг Агаты; а сама глава (хатка, возвращение садовника) — не проходится за игрока
                .andExpect(jsonPath("$.errands[?(@.key == 'agata_hearth')].done").value(true))
                .andExpect(jsonPath("$.errands[?(@.key == 'beaver_lodge')].done").value(false))
                .andExpect(jsonPath("$.errands[?(@.key == 'gardener_return')].done").value(false));
    }

    @Test
    void fogCanBeHurriedDayByDayOrClearedAtOnce() throws Exception {
        mvc.perform(post("/api/test/open-paths"));
        mvc.perform(post("/api/test/fog-day"));
        mvc.perform(post("/api/test/fog-day"));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.fog.days").value(2));

        mvc.perform(post("/api/test/fog-clear"));
        mvc.perform(get("/api/state")).andExpect(jsonPath("$.fog.days").value(7));
    }

    @Test
    void resetStartsANewGame() throws Exception {
        mvc.perform(post("/api/test/resources"));
        mvc.perform(post("/api/test/open-paths"));

        mvc.perform(post("/api/test/reset")).andExpect(status().isNoContent());

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.inventory").isEmpty())
                .andExpect(jsonPath("$.worldObjects").isEmpty())
                .andExpect(jsonPath("$.fog.started").value(false));
    }
}
