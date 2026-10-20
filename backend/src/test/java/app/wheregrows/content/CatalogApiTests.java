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
                .andExpect(jsonPath("$.species", hasSize(8)))
                .andExpect(jsonPath("$.species[?(@.key == 'radish')].stageMinutes[0]").value(10))
                .andExpect(jsonPath("$.items[?(@.key == 'seed_radish')].kind").value("SEED"))
                .andExpect(jsonPath("$.items[?(@.key == 'seed_radish')].price").value(2))
                .andExpect(jsonPath("$.items[?(@.key == 'seed_radish')].speciesKey").value("radish"))
                // цветы из городка продаются только после поручения Лизы
                .andExpect(jsonPath("$.items[?(@.key == 'seed_iris')].unlockErrand").value("liza_irises"))
                .andExpect(jsonPath("$.items[?(@.key == 'seed_radish')].unlockErrand").value(org.hamcrest.Matchers.contains((Object) null)));
    }

    @Test
    void catalogListsLocationsConnectedByDoors() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(jsonPath("$.locations", hasSize(11)))
                .andExpect(jsonPath("$.locations[0].key").value("home"))
                .andExpect(jsonPath("$.locations[0].props[?(@.key == 'shed')].door.map").value("shed"))
                // калитка ведёт на тропу, только когда её пробудили
                .andExpect(jsonPath("$.locations[0].props[?(@.key == 'east-gate')].door.requires").value("east-gate"))
                .andExpect(jsonPath("$.locations[?(@.key == 'shed')].props[?(@.key == 'shed-exit')].door.map").value("home"))
                .andExpect(jsonPath("$.locations[?(@.key == 'shed')].props[?(@.key == 'letter')].read").isNotEmpty())
                // на тропе живут мыши со своими разговорами
                .andExpect(jsonPath("$.locations[?(@.key == 'east')].npcs[*].key").value(org.hamcrest.Matchers.containsInAnyOrder("krupka", "shorokh", "vetosh", "khmur")))
                .andExpect(jsonPath("$.recipes[?(@.key == 'repair_wheelbarrow')].actionLabel").value("Починить"))
                // к озеру — только когда Мята довольна садом; засохшие клумбы оживают от воды в колодце
                .andExpect(jsonPath("$.locations[?(@.key == 'manor')].props[?(@.key == 'lake-path')].door.requiresErrand").value("myata_garden"))
                .andExpect(jsonPath("$.locations[?(@.key == 'manor')].tiles.d.revive.when").value("manor-well"))
                // лодка плывёт в городок у мельницы, когда рассеялся туман; жители городка — люди с обликом
                .andExpect(jsonPath("$.locations[?(@.key == 'lake')].props[?(@.key == 'dock')].door.map").value("town"))
                .andExpect(jsonPath("$.locations[?(@.key == 'lake')].props[?(@.key == 'dock')].door.requiresFog").value(true))
                .andExpect(jsonPath("$.locations[?(@.key == 'town')].npcs[?(@.key == 'agata')].appearance.hair").value("bun"))
                // глава 3: к плотине — когда Агата дома рассказала о садовнике; канава наполняется, когда построена хатка
                .andExpect(jsonPath("$.locations[?(@.key == 'town')].props[?(@.key == 'dam-path')].door.requiresErrand").value("agata_hearth"))
                .andExpect(jsonPath("$.locations[?(@.key == 'dam')].tiles.c.revive.when").value("beaver-lodge"))
                .andExpect(jsonPath("$.locations[?(@.key == 'home')].npcs[?(@.key == 'gardener-home')].appearsAfter").value("gardener_return"))
                // на Лунную поляну — только ночью
                .andExpect(jsonPath("$.locations[?(@.key == 'east')].props[?(@.key == 'night-path')].door.requiresNight").value(true))
                // в Светлолесье — ночью, когда Хмур зажёг фонари
                .andExpect(jsonPath("$.locations[?(@.key == 'glade')].props[?(@.key == 'glade-deep-path')].door.requiresErrand").value("khmur_lamps"))
                .andExpect(jsonPath("$.locations[?(@.key == 'dreamwood')].npcs[?(@.key == 'murlana')].kind").value("greatcat"));
    }
}
