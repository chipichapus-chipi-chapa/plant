package app.wheregrows.state;

import java.time.LocalDate;
import java.util.List;

import app.wheregrows.habit.HabitService.DailyRewards;
import app.wheregrows.habit.HabitView;

/**
 * Снимок состояния игрока. Расширяется по мере появления механик (сад, коллекция).
 * {@code today} — дата по часовому поясу игрока, вычисленная сервером.
 * Все ресурсы, включая Семена жизни и осколки, лежат в {@code inventory}.
 */
record GameStateResponse(Player player, LocalDate today, List<InventoryEntry> inventory, List<HabitView> habits,
                         DailyRewards dailyRewards) {

    record Player(String displayName, String timezone) {
    }

    record InventoryEntry(String itemKey, int quantity) {
    }
}
