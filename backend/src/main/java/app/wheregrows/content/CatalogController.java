package app.wheregrows.content;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;
import app.wheregrows.exploration.ArtifactRepository;
import app.wheregrows.exploration.DiscoverySpotRepository;
import app.wheregrows.magic.RecipeRepository;

/** Каталог одинаков для всех игроков: категории кристаллов, растения, предметы с ценами и карта сада. */
@RestController
class CatalogController {

    private final CrystalCategoryRepository crystals;
    private final PlantSpeciesRepository species;
    private final ItemDefinitionRepository items;
    private final GardenMaps gardens;
    private final RecipeRepository recipes;
    private final ArtifactRepository artifacts;
    private final DiscoverySpotRepository spots;

    CatalogController(CrystalCategoryRepository crystals, PlantSpeciesRepository species, ItemDefinitionRepository items,
                      GardenMaps gardens, RecipeRepository recipes, ArtifactRepository artifacts,
                      DiscoverySpotRepository spots) {
        this.recipes = recipes;
        this.artifacts = artifacts;
        this.spots = spots;
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
                gardens.home(),
                recipes.findAllByOrderBySortOrderAsc().stream()
                        .map(r -> new CatalogResponse.Recipe(r.getKey(), r.getName(), r.getDescription(),
                                r.getTargetObjectKey(), r.getResultText(),
                                r.getIngredients().stream()
                                        .map(i -> new CatalogResponse.Ingredient(i.itemKey(), i.quantity()))
                                        .toList()))
                        .toList(),
                artifacts.findAllByOrderBySortOrderAsc().stream()
                        .map(a -> new CatalogResponse.Artifact(a.getKey(), a.getName(), a.getCrystalCategory(),
                                a.getDescription(), a.getLegend(), a.getAcquisitionHint(), a.getEffectText()))
                        .toList(),
                // содержимое тайников не раскрываем — только где можно искать
                spots.findAll(Sort.by("key")).stream()
                        .map(s -> new CatalogResponse.Spot(s.getKey(), s.getPropKey()))
                        .toList());
    }

    record CatalogResponse(List<Crystal> crystals, List<Species> species, List<Item> items, GardenMap garden,
                           List<Recipe> recipes, List<Artifact> artifacts, List<Spot> spots) {

        record Artifact(String key, String name, String crystalCategory, String description, String legend,
                        String acquisitionHint, String effectText) {
        }

        record Spot(String key, String propKey) {
        }

        record Recipe(String key, String name, String description, String targetObjectKey, String resultText,
                      List<Ingredient> ingredients) {
        }

        record Ingredient(String itemKey, int quantity) {
        }

        record Crystal(String key, String name, String color, String meaning) {
        }

        record Species(String key, String name, int[] stageMinutes) {
        }

        record Item(String key, ItemKind kind, String name, String description, Integer price,
                    String speciesKey, String crystalCategory) {
        }
    }
}
