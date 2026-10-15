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

/**
 * Контент живёт в двух местах: рецепты и точки находок — в базе, карта — в JSON. Связи между ними
 * (рецепт → постройка, находка → постройка) проверяются при старте: опечатка в ключе роняет запуск,
 * а не ломает игру у игрока.
 */
@Component
class ContentConsistency implements ApplicationRunner {

    private final RecipeRepository recipes;
    private final DiscoverySpotRepository spots;
    private final GardenMaps maps;

    ContentConsistency(RecipeRepository recipes, DiscoverySpotRepository spots, GardenMaps maps) {
        this.recipes = recipes;
        this.spots = spots;
        this.maps = maps;
    }

    @Override
    @Transactional(readOnly = true)
    public void run(ApplicationArguments args) {
        Set<String> props = maps.home().props().stream().map(GardenMap.Prop::key).collect(Collectors.toSet());
        for (Recipe recipe : recipes.findAll()) {
            requireProp(props, recipe.getTargetObjectKey(), "Рецепт " + recipe.getKey());
        }
        for (DiscoverySpot spot : spots.findAll()) {
            requireProp(props, spot.getPropKey(), "Место находки " + spot.getKey());
            if (spot.getRequiresAwakened() != null) {
                requireProp(props, spot.getRequiresAwakened(), "Условие места находки " + spot.getKey());
            }
        }
    }

    private static void requireProp(Set<String> props, String key, String who) {
        if (!props.contains(key)) {
            throw new IllegalStateException(who + " ссылается на постройку " + key + ", которой нет на карте сада");
        }
    }
}
