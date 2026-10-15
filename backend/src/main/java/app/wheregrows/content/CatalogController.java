package app.wheregrows.content;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Каталог одинаков для всех игроков: категории кристаллов, виды растений и предметы с ценами. */
@RestController
class CatalogController {

    private final CrystalCategoryRepository crystals;
    private final PlantSpeciesRepository species;
    private final ItemDefinitionRepository items;

    CatalogController(CrystalCategoryRepository crystals, PlantSpeciesRepository species, ItemDefinitionRepository items) {
        this.crystals = crystals;
        this.species = species;
        this.items = items;
    }

    @GetMapping("/api/catalog")
    CatalogResponse catalog() {
        return new CatalogResponse(
                crystals.findAll(Sort.by("sortOrder")).stream()
                        .map(c -> new CatalogResponse.Crystal(c.getKey(), c.getName(), c.getColor(), c.getMeaning()))
                        .toList(),
                species.findAll(Sort.by("key")).stream()
                        .map(s -> new CatalogResponse.Species(s.getKey(), s.getName(), s.getStageMinutes()))
                        .toList(),
                items.findAll(Sort.by("key")).stream()
                        .map(i -> new CatalogResponse.Item(i.getKey(), i.getKind(), i.getName(),
                                i.getDescription(), i.getPrice(), i.getSpeciesKey(), i.getCrystalCategory()))
                        .toList());
    }

    record CatalogResponse(List<Crystal> crystals, List<Species> species, List<Item> items) {

        record Crystal(String key, String name, String color, String meaning) {
        }

        record Species(String key, String name, int[] stageMinutes) {
        }

        record Item(String key, ItemKind kind, String name, String description, Integer price,
                    String speciesKey, String crystalCategory) {
        }
    }
}
