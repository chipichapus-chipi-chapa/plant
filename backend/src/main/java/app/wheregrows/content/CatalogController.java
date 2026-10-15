package app.wheregrows.content;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;

/** Каталог одинаков для всех игроков: категории кристаллов, растения, предметы с ценами и карта сада. */
@RestController
class CatalogController {

    private final CrystalCategoryRepository crystals;
    private final PlantSpeciesRepository species;
    private final ItemDefinitionRepository items;
    private final GardenMaps gardens;

    CatalogController(CrystalCategoryRepository crystals, PlantSpeciesRepository species, ItemDefinitionRepository items,
                      GardenMaps gardens) {
        this.crystals = crystals;
        this.species = species;
        this.items = items;
        this.gardens = gardens;
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
                        .toList(),
                gardens.home());
    }

    record CatalogResponse(List<Crystal> crystals, List<Species> species, List<Item> items, GardenMap garden) {

        record Crystal(String key, String name, String color, String meaning) {
        }

        record Species(String key, String name, int[] stageMinutes) {
        }

        record Item(String key, ItemKind kind, String name, String description, Integer price,
                    String speciesKey, String crystalCategory) {
        }
    }
}
