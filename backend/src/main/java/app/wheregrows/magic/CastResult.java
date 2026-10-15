package app.wheregrows.magic;

import java.util.List;

import app.wheregrows.economy.ItemGrant;

/** Итог применения рецепта: какой объект пробудился, что потрачено и что теперь видит игрок. */
public record CastResult(String recipeKey, String objectKey, String state, List<ItemGrant> spent, String resultText) {
}
