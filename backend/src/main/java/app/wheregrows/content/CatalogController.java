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
import app.wheregrows.mentor.MentorContent;
import app.wheregrows.mentor.MentorContentLoader;
import app.wheregrows.player.AppearanceSlotRepository;
import app.wheregrows.puzzle.PuzzleRepository;

/** Каталог одинаков для всех игроков: категории кристаллов, растения, предметы с ценами, карты локаций, загадки. */
@RestController
class CatalogController {

    private final CrystalCategoryRepository crystals;
    private final PlantSpeciesRepository species;
    private final ItemDefinitionRepository items;
    private final GardenMaps gardens;
    private final RecipeRepository recipes;
    private final ArtifactRepository artifacts;
    private final DiscoverySpotRepository spots;
    private final AppearanceSlotRepository appearance;
    private final MentorContentLoader mentor;
    private final PuzzleRepository puzzles;

    CatalogController(CrystalCategoryRepository crystals, PlantSpeciesRepository species, ItemDefinitionRepository items,
                      GardenMaps gardens, RecipeRepository recipes, ArtifactRepository artifacts,
                      DiscoverySpotRepository spots, AppearanceSlotRepository appearance, MentorContentLoader mentor,
                      PuzzleRepository puzzles) {
        this.puzzles = puzzles;
        this.mentor = mentor;
        this.appearance = appearance;
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
                                i.getDescription(), i.getPrice(), i.getSpeciesKey(), i.getCrystalCategory(),
                                i.getUnlockErrand()))
                        .toList(),
                gardens.home(),
                gardens.all(),
                recipes.findAllByOrderBySortOrderAsc().stream()
                        .map(r -> new CatalogResponse.Recipe(r.getKey(), r.getName(), r.getDescription(),
                                r.getTargetObjectKey(), r.getResultText(), r.getActionLabel(),
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
                        .map(s -> new CatalogResponse.Spot(s.getKey(), s.getPropKey(), s.isHidden(), s.getActionLabel()))
                        .toList(),
                appearance.findAllByOrderBySortOrderAsc().stream()
                        .map(slot -> new CatalogResponse.AppearanceSlot(slot.getKey(), slot.getName(), slot.getKind(),
                                slot.getOptions().stream()
                                        .map(o -> new CatalogResponse.AppearanceOption(o.key(), o.name(), o.color()))
                                        .toList()))
                        .toList(),
                mentor.content(),
                // ответ не раскрываем — только символы и число колёсиков
                puzzles.findAll(Sort.by("key")).stream()
                        .map(p -> new CatalogResponse.Puzzle(p.getKey(), p.getPropKey(), p.getPrompt(), p.getDials(),
                                p.getSymbols().stream().map(s -> new CatalogResponse.PuzzleSymbol(s.key(), s.name())).toList()))
                        .toList());
    }

    /**
     * @param garden    домашний сад (то же, что первая из locations; оставлен для простоты клиента)
     * @param locations все локации: сад, сарай изнутри…
     */
    record CatalogResponse(List<Crystal> crystals, List<Species> species, List<Item> items, GardenMap garden,
                           List<GardenMap> locations, List<Recipe> recipes, List<Artifact> artifacts, List<Spot> spots,
                           List<AppearanceSlot> appearance, MentorContent mentor, List<Puzzle> puzzles) {

        record Puzzle(String key, String propKey, String prompt, int dials, List<PuzzleSymbol> symbols) {
        }

        record PuzzleSymbol(String key, String name) {
        }

        record AppearanceSlot(String key, String name, String kind, List<AppearanceOption> options) {
        }

        record AppearanceOption(String key, String name, String color) {
        }

        record Artifact(String key, String name, String crystalCategory, String description, String legend,
                        String acquisitionHint, String effectText) {
        }

        /** hidden — секретка (без мерцания); actionLabel — надпись на кнопке. */
        record Spot(String key, String propKey, boolean hidden, String actionLabel) {
        }

        record Recipe(String key, String name, String description, String targetObjectKey, String resultText,
                      String actionLabel, List<Ingredient> ingredients) {
        }

        record Ingredient(String itemKey, int quantity) {
        }

        record Crystal(String key, String name, String color, String meaning) {
        }

        record Species(String key, String name, int[] stageMinutes) {
        }

        /** unlockErrand — товар появляется в лавке после этого поручения (null — сразу). */
        record Item(String key, ItemKind kind, String name, String description, Integer price,
                    String speciesKey, String crystalCategory, String unlockErrand) {
        }
    }
}
