package app.wheregrows.state;

import java.time.LocalDate;
import java.util.List;

import app.wheregrows.garden.GardenObjectView;
import app.wheregrows.habit.HabitService.DailyRewards;
import app.wheregrows.habit.HabitView;

/**
 * Снимок состояния игрока. Расширяется по мере появления механик (коллекция, магия).
 * {@code today} — дата по часовому поясу игрока, вычисленная сервером.
 * Все ресурсы, включая Семена жизни и осколки, лежат в {@code inventory}.
 */
record GameStateResponse(Player player, LocalDate today, List<InventoryEntry> inventory, List<HabitView> habits,
                         DailyRewards dailyRewards, Garden garden) {

    /** Что растёт в саду игрока. Карта (общая для всех) — в /api/catalog. */
    record Garden(List<GardenObjectView> objects) {
    }

    record Player(String displayName, String timezone) {
    }

    record InventoryEntry(String itemKey, int quantity) {
    }
}
