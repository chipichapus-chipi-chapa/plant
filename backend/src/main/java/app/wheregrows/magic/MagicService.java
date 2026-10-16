package app.wheregrows.magic;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.content.ItemDefinition;
import app.wheregrows.content.ItemDefinitionRepository;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.InventoryItemRepository;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Применение рецептов к объектам мира.
 *
 * <p>Все ингредиенты списываются в одной транзакции: если чего-то не хватает, не списывается ничего.
 * Пробуждённый объект остаётся пробуждённым навсегда — повторно потратить ресурсы на него нельзя.
 */
@Service
public class MagicService {

    private final RecipeRepository recipes;
    private final WorldObjectStateRepository states;
    private final ItemDefinitionRepository items;
    private final InventoryItemRepository inventoryItems;
    private final Inventory inventory;
    private final PlayerProfileRepository players;
    private final GardenMaps maps;
    private final Clock clock;

    MagicService(RecipeRepository recipes, WorldObjectStateRepository states, ItemDefinitionRepository items,
                 InventoryItemRepository inventoryItems, Inventory inventory, PlayerProfileRepository players,
                 GardenMaps maps, Clock clock) {
        this.recipes = recipes;
        this.states = states;
        this.items = items;
        this.inventoryItems = inventoryItems;
        this.inventory = inventory;
        this.players = players;
        this.maps = maps;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<WorldObjectState> worldObjects(long playerId) {
        return states.findByIdPlayerIdOrderByIdObjectKey(playerId);
    }

    @Transactional(readOnly = true)
    public boolean isAwakened(long playerId, String objectKey) {
        return states.existsById(new WorldObjectState.Id(playerId, objectKey));
    }

    @Transactional
    public CastResult cast(long playerId, String recipeKey) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        Recipe recipe = recipes.findById(recipeKey).orElseThrow(() -> new NotFoundException("Такого рецепта нет."));
        String targetName = targetName(recipe);

        if (states.existsById(new WorldObjectState.Id(playerId, recipe.getTargetObjectKey()))) {
            throw new ConflictException("Здесь уже всё сделано: «" + targetName + "». Повторно тратить ничего не нужно.");
        }

        Map<String, ItemDefinition> definitions = items.findAllById(
                        recipe.getIngredients().stream().map(Recipe.Ingredient::itemKey).toList()).stream()
                .collect(Collectors.toMap(ItemDefinition::getKey, Function.identity()));

        // Сначала собираем всё, чего не хватает, — чтобы сказать игроку сразу полный список
        List<String> missing = new ArrayList<>();
        for (Recipe.Ingredient ingredient : recipe.getIngredients()) {
            int have = inventoryItems.quantityOf(playerId, ingredient.itemKey());
            if (have < ingredient.quantity()) {
                missing.add(definitions.get(ingredient.itemKey()).getName()
                        + " (нужно " + ingredient.quantity() + ", есть " + have + ")");
            }
        }
        if (!missing.isEmpty()) {
            throw new ConflictException("Пока не хватает: " + String.join(", ", missing)
                    + ". Ничего не потрачено.");
        }

        List<ItemGrant> spent = new ArrayList<>();
        for (Recipe.Ingredient ingredient : recipe.getIngredients()) {
            inventory.spend(playerId, ingredient.itemKey(), ingredient.quantity(),
                    definitions.get(ingredient.itemKey()).getName());
            spent.add(new ItemGrant(ingredient.itemKey(), ingredient.quantity()));
        }
        states.saveAndFlush(new WorldObjectState(playerId, recipe.getTargetObjectKey(), WorldObjectState.AWAKENED,
                clock.instant()));
        return new CastResult(recipe.getKey(), recipe.getTargetObjectKey(), WorldObjectState.AWAKENED, spent,
                recipe.getResultText());
    }

    private String targetName(Recipe recipe) {
        return maps.prop(recipe.getTargetObjectKey()).map(GardenMap.Prop::name).orElseThrow();
    }
}
