package app.wheregrows.content;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import app.wheregrows.TestcontainersConfiguration;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class CatalogApiTests {

    @Autowired
    MockMvc mvc;

    @Test
    void catalogListsCrystalsSpeciesAndItems() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.crystals", hasSize(6)))
                .andExpect(jsonPath("$.crystals[0].key").value("emerald"))
                .andExpect(jsonPath("$.crystals[0].color").value("#4fae6a"))
                .andExpect(jsonPath("$.items[?(@.key == 'life_seed')].kind").value("CURRENCY"))
                .andExpect(jsonPath("$.items[?(@.key == 'shard_rose')].crystalCategory").value("rose"))
                .andExpect(jsonPath("$.species", hasSize(3)))
                .andExpect(jsonPath("$.species[?(@.key == 'radish')].stageMinutes[0]").value(10))
                .andExpect(jsonPath("$.items[?(@.key == 'seed_radish')].kind").value("SEED"))
                .andExpect(jsonPath("$.items[?(@.key == 'seed_radish')].price").value(2))
                .andExpect(jsonPath("$.items[?(@.key == 'seed_radish')].speciesKey").value("radish"));
    }

    @Test
    void catalogListsLocationsConnectedByDoors() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(jsonPath("$.locations", hasSize(2)))
                .andExpect(jsonPath("$.locations[0].key").value("home"))
                .andExpect(jsonPath("$.locations[0].props[?(@.key == 'shed')].door.map").value("shed"))
                .andExpect(jsonPath("$.locations[1].props[?(@.key == 'shed-exit')].door.map").value("home"))
                .andExpect(jsonPath("$.locations[1].props[?(@.key == 'letter')].read").isNotEmpty())
                .andExpect(jsonPath("$.recipes[?(@.key == 'repair_wheelbarrow')].actionLabel").value("Починить"));
    }
}
