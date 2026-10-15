package app.wheregrows.player;

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

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=profile-test")
@AutoConfigureMockMvc
class ProfileApiTests {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    CurrentPlayer currentPlayer;

    @BeforeEach
    void freshCharacter() {
        long id = currentPlayer.id();
        jdbc.update("DELETE FROM player_appearance WHERE player_id = ?", id);
        jdbc.update("UPDATE player_profile SET onboarded_at = NULL, display_name = 'Садовник' WHERE user_id = ?", id);
    }

    @Test
    void newPlayerHasDefaultLookAndIsNotOnboarded() throws Exception {
        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.player.onboarded").value(false))
                .andExpect(jsonPath("$.player.appearance.skin").value("light"))
                .andExpect(jsonPath("$.player.appearance.hair").value("short"))
                .andExpect(jsonPath("$.player.appearance.accessory").value("none"));
    }

    @Test
    void savingCharacterUpdatesNameLookAndOnboarding() throws Exception {
        save("  Катя  ", "{\"hair\":\"braid\",\"hair_color\":\"copper\",\"outfit\":\"dress\",\"accessory\":\"straw_hat\"}")
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.player.displayName").value("Катя"))
                .andExpect(jsonPath("$.player.onboarded").value(true))
                .andExpect(jsonPath("$.player.appearance.hair").value("braid"))
                .andExpect(jsonPath("$.player.appearance.hair_color").value("copper"))
                .andExpect(jsonPath("$.player.appearance.skin").value("light"));
    }

    @Test
    void partialUpdateKeepsOtherSlots() throws Exception {
        save("Катя", "{\"hair\":\"bun\",\"outfit_color\":\"plum\"}").andExpect(status().isNoContent());
        save("Катя", "{\"hair\":\"curly\"}").andExpect(status().isNoContent());

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.player.appearance.hair").value("curly"))
                .andExpect(jsonPath("$.player.appearance.outfit_color").value("plum"));
    }

    @Test
    void unknownSlotsAndOptionsAreRejectedAndNothingChanges() throws Exception {
        save("Катя", "{\"wings\":\"big\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Неизвестная часть облика: wings."));
        save("Катя", "{\"hair\":\"mohawk\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Для «Причёска» нет варианта mohawk."));

        mvc.perform(get("/api/state"))
                .andExpect(jsonPath("$.player.displayName").value("Садовник"))
                .andExpect(jsonPath("$.player.onboarded").value(false));
    }

    @Test
    void nameIsValidated() throws Exception {
        save("   ", "{}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Как вас зовут?"));
        save("я".repeat(41), "{}").andExpect(status().isBadRequest());
    }

    @Test
    void catalogDescribesAppearanceSlots() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(jsonPath("$.appearance", hasSize(6)))
                .andExpect(jsonPath("$.appearance[0].key").value("skin"))
                .andExpect(jsonPath("$.appearance[0].kind").value("COLOR"))
                .andExpect(jsonPath("$.appearance[0].options[0].color").value("#f7e1d2"))
                .andExpect(jsonPath("$.appearance[1].options", hasSize(6)));
    }

    private ResultActions save(String name, String appearanceJson) throws Exception {
        return mvc.perform(put("/api/profile").contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\":\"" + name + "\",\"appearance\":" + appearanceJson + "}"));
    }
}
