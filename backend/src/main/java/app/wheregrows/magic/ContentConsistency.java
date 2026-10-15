package app.wheregrows.magic;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;

/**
 * Контент живёт в двух местах: рецепты — в базе, карта — в JSON. Связь между ними
 * (рецепт → постройка) проверяется при старте: опечатка в ключе роняет запуск, а не ломает игру.
 */
@Component
class ContentConsistency implements ApplicationRunner {

    private final RecipeRepository recipes;
    private final GardenMaps maps;

    ContentConsistency(RecipeRepository recipes, GardenMaps maps) {
        this.recipes = recipes;
        this.maps = maps;
    }

    @Override
    @Transactional(readOnly = true)
    public void run(ApplicationArguments args) {
        Set<String> props = maps.home().props().stream().map(GardenMap.Prop::key).collect(Collectors.toSet());
        for (Recipe recipe : recipes.findAll()) {
            if (!props.contains(recipe.getTargetObjectKey())) {
                throw new IllegalStateException("Рецепт " + recipe.getKey() + " ссылается на постройку "
                        + recipe.getTargetObjectKey() + ", которой нет на карте сада");
            }
        }
    }
}
