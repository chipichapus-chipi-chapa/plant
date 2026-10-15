package app.wheregrows.garden;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import app.wheregrows.TestcontainersConfiguration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class GardenMapTests {

    @Autowired
    GardenMaps gardens;

    @Autowired
    MockMvc mvc;

    @Test
    void homeGardenIsLoadedAndHasFreeBeds() {
        GardenMap home = gardens.home();
        long plantable = 0;
        for (int y = 0; y < home.height(); y++) {
            for (int x = 0; x < home.width(); x++) {
                if (home.tileAt(x, y).plantable()) {
                    plantable++;
                }
            }
        }
        assertThat(plantable).isEqualTo(12);
        assertThat(home.propAt(15, 6).key()).isEqualTo("east-gate");
    }

    @Test
    void catalogServesTheGardenMap() throws Exception {
        mvc.perform(get("/api/catalog"))
                .andExpect(jsonPath("$.garden.width").value(16))
                .andExpect(jsonPath("$.garden.rows", hasSize(10)))
                .andExpect(jsonPath("$.garden.tiles.s.plantable").value(true))
                .andExpect(jsonPath("$.garden.props[?(@.key == 'shed')].width").value(4));
    }

    @Test
    void brokenMapIsRejected() {
        GardenMap.TileType grass = new GardenMap.TileType("grass", "Трава", "", false);
        GardenMap tooShort = new GardenMap("broken", "", 3, 1, Map.of(".", grass), List.of(".."), List.of());
        GardenMap unknownChar = new GardenMap("broken", "", 2, 1, Map.of(".", grass), List.of(".?"), List.of());
        GardenMap propOutside = new GardenMap("broken", "", 2, 1, Map.of(".", grass), List.of(".."),
                List.of(new GardenMap.Prop("big", "shed", 1, 0, 2, 1, "", "")));

        assertThatThrownBy(tooShort::validate).hasMessageContaining("width");
        assertThatThrownBy(unknownChar::validate).hasMessageContaining("'?'");
        assertThatThrownBy(propOutside::validate).hasMessageContaining("за край");
    }
}
