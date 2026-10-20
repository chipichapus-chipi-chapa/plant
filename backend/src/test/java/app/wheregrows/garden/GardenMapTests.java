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

    /** Те же клетки, по которым клиент пускает ходить (frontend/src/game/movement.ts, WALKABLE). */
    static final java.util.Set<String> WALKABLE = java.util.Set.of("grass", "weeds", "path", "soil", "overgrown", "floor", "bridge", "rug");

    /**
     * К каждой двери можно подойти: рядом есть клетка, по которой ходят и которую не занимает постройка.
     * Иначе дверь не открыть (так было с лодкой: стояла в воде, а причал не пускал к ней).
     */
    @Test
    void everyDoorCanBeReached() {
        for (GardenMap map : gardens.all()) {
            for (GardenMap.Prop prop : map.props()) {
                if (prop.door() == null) {
                    continue;
                }
                boolean reachable = false;
                for (int y = prop.y() - 1; y <= prop.y() + prop.height(); y++) {
                    for (int x = prop.x() - 1; x <= prop.x() + prop.width(); x++) {
                        boolean side = (x == prop.x() - 1 || x == prop.x() + prop.width()) != (y == prop.y() - 1 || y == prop.y() + prop.height());
                        if (side && map.contains(x, y) && WALKABLE.contains(map.tileAt(x, y).type()) && map.propAt(x, y) == null) {
                            reachable = true;
                        }
                    }
                }
                org.assertj.core.api.Assertions.assertThat(reachable)
                        .as("к двери «%s» на карте %s не подойти", prop.name(), map.key())
                        .isTrue();
            }
        }
    }

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
                List.of(new GardenMap.Prop("big", "shed", 1, 0, 2, 1, "", "", null, null)));

        assertThatThrownBy(tooShort::validate).hasMessageContaining("width");
        assertThatThrownBy(unknownChar::validate).hasMessageContaining("'?'");
        assertThatThrownBy(propOutside::validate).hasMessageContaining("за край");
    }
}
