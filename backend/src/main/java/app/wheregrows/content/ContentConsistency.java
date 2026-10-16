package app.wheregrows.content;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.exploration.DiscoverySpot;
import app.wheregrows.exploration.DiscoverySpotRepository;
import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;
import app.wheregrows.magic.Recipe;
import app.wheregrows.magic.RecipeRepository;
import app.wheregrows.mentor.MentorContentLoader;
import app.wheregrows.puzzle.Puzzle;
import app.wheregrows.puzzle.PuzzleRepository;

/**
 * Контент живёт в двух местах: рецепты, точки находок и загадки — в базе, карты — в JSON. Связи между ними
 * (рецепт / находка / загадка → постройка на любой карте, подарок наставника → предмет, ответ загадки → её символы)
 * проверяются при старте: опечатка в ключе роняет запуск, а не ломает игру у игрока.
 */
@Component
class ContentConsistency implements ApplicationRunner {

    private final RecipeRepository recipes;
    private final DiscoverySpotRepository spots;
    private final GardenMaps maps;
    private final MentorContentLoader mentor;
    private final ItemDefinitionRepository items;
    private final PuzzleRepository puzzles;

    ContentConsistency(RecipeRepository recipes, DiscoverySpotRepository spots, GardenMaps maps,
                       MentorContentLoader mentor, ItemDefinitionRepository items, PuzzleRepository puzzles) {
        this.puzzles = puzzles;
        this.recipes = recipes;
        this.spots = spots;
        this.maps = maps;
        this.mentor = mentor;
        this.items = items;
    }

    @Override
    @Transactional(readOnly = true)
    public void run(ApplicationArguments args) {
        Set<String> props = maps.all().stream().flatMap(m -> m.props().stream()).map(GardenMap.Prop::key)
                .collect(Collectors.toSet());
        for (Recipe recipe : recipes.findAll()) {
            requireProp(props, recipe.getTargetObjectKey(), "Рецепт " + recipe.getKey());
        }
        for (DiscoverySpot spot : spots.findAll()) {
            requireProp(props, spot.getPropKey(), "Место находки " + spot.getKey());
            if (spot.getRequiresAwakened() != null) {
                requireProp(props, spot.getRequiresAwakened(), "Условие места находки " + spot.getKey());
            }
        }
        for (Puzzle puzzle : puzzles.findAll()) {
            requireProp(props, puzzle.getPropKey(), "Загадка " + puzzle.getKey());
            Set<String> symbols = puzzle.getSymbols().stream().map(Puzzle.Symbol::key).collect(Collectors.toSet());
            if (!symbols.containsAll(puzzle.getAnswer())) {
                throw new IllegalStateException("Ответ загадки " + puzzle.getKey() + " содержит символ, которого нет на замке");
            }
        }
        // цели обучения — существующие постройки и типы клеток карт
        java.util.Set<String> tileTypes = maps.all().stream().flatMap(m -> m.tiles().values().stream())
                .map(GardenMap.TileType::type).collect(Collectors.toSet());
        for (var step : mentor.content().tutorial()) {
            if (step.target().prop() != null) requireProp(props, step.target().prop(), "Цель шага " + step.key());
            if (step.target().tile() != null && !tileTypes.contains(step.target().tile())) {
                throw new IllegalStateException("Цель шага " + step.key() + " — неизвестный тип клетки " + step.target().tile());
            }
        }
        // подарки наставника — существующие предметы каталога
        mentor.content().dialogues().forEach((key, dialogue) -> dialogue.giftOrEmpty().forEach(gift -> {
            if (!items.existsById(gift.itemKey())) {
                throw new IllegalStateException("Подарок в диалоге " + key + " — неизвестный предмет " + gift.itemKey());
            }
        }));
    }

    private static void requireProp(Set<String> props, String key, String who) {
        if (!props.contains(key)) {
            throw new IllegalStateException(who + " ссылается на постройку " + key + ", которой нет ни на одной карте");
        }
    }
}
