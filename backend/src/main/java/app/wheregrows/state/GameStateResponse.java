package app.wheregrows.state;

import java.time.LocalDate;
import java.util.List;

/**
 * Снимок состояния игрока. Расширяется по мере появления механик (привычки, сад).
 * {@code today} — дата по часовому поясу игрока, вычисленная сервером.
 */
record GameStateResponse(Player player, LocalDate today, List<InventoryEntry> inventory) {

    record Player(String displayName, int coins, String timezone) {
    }

    record InventoryEntry(String itemKey, int quantity) {
    }
}
