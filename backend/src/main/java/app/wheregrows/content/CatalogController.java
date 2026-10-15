package app.wheregrows.content;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Каталог одинаков для всех игроков: виды растений и предметы с ценами. */
@RestController
class CatalogController {

    private final PlantSpeciesRepository species;
    private final ItemDefinitionRepository items;

    CatalogController(PlantSpeciesRepository species, ItemDefinitionRepository items) {
        this.species = species;
        this.items = items;
    }

    @GetMapping("/api/catalog")
    CatalogResponse catalog() {
        return new CatalogResponse(
                species.findAll(Sort.by("key")).stream()
                        .map(s -> new CatalogResponse.Species(s.getKey(), s.getName(), s.getStageMinutes()))
                        .toList(),
                items.findAll(Sort.by("key")).stream()
                        .map(i -> new CatalogResponse.Item(i.getKey(), i.getKind(), i.getName(),
                                i.getDescription(), i.getPrice(), i.getSpeciesKey()))
                        .toList());
    }

    record CatalogResponse(List<Species> species, List<Item> items) {

        record Species(String key, String name, int[] stageMinutes) {
        }

        record Item(String key, ItemKind kind, String name, String description, Integer price, String speciesKey) {
        }
    }
}
