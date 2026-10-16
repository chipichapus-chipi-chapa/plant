package app.wheregrows.puzzle;

import java.util.List;

import app.wheregrows.economy.ItemGrant;

/**
 * Итог попытки открыть замок.
 *
 * @param solved открыто (сейчас или раньше)
 * @param reward что получено этой попыткой; пусто, если ошиблись или замок уже был открыт
 */
public record AttemptResult(String puzzleKey, boolean solved, String text, List<ItemGrant> reward) {
}
