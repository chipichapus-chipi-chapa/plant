package app.wheregrows.state;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import app.wheregrows.errand.ErrandService;
import app.wheregrows.garden.GardenObjectView;
import app.wheregrows.garden.GardenService;
import app.wheregrows.habit.HabitService.DailyRewards;
import app.wheregrows.habit.HabitView;
import app.wheregrows.mentor.MentorProgress;

/**
 * Снимок состояния игрока. Расширяется по мере появления механик (коллекция, магия).
 * {@code today} — дата по часовому поясу игрока, вычисленная сервером.
 * Все ресурсы, включая Семена жизни и осколки, лежат в {@code inventory}.
 */
record GameStateResponse(Player player, LocalDate today, List<InventoryEntry> inventory, List<HabitView> habits,
                         DailyRewards dailyRewards, Garden garden, List<WorldObject> worldObjects,
                         List<String> searchedSpots, List<CollectedArtifact> artifacts, MentorProgress mentor,
                         List<String> solvedPuzzles, List<ErrandService.ErrandState> errands) {

    /** Артефакт в коллекции: когда и где найден. Описание — в каталоге. */
    record CollectedArtifact(String key, Instant foundAt, String foundWhere) {
    }

    /** Пробуждённые объекты мира (постройки с карты). Нет в списке — объект спит. */
    record WorldObject(String objectKey, String state) {
    }

    /**
     * Что растёт в саду игрока и какие заросшие грядки он уже прополол (они стали обычными).
     * Карта (общая для всех) — в /api/catalog.
     */
    record Garden(List<GardenObjectView> objects, List<GardenService.Cell> weeded) {
    }

    /**
     * @param onboarded  персонаж уже создан (иначе клиент покажет окно «Новый садовник»)
     * @param appearance слот внешности → выбранный вариант
     */
    record Player(String displayName, String timezone, boolean onboarded, Map<String, String> appearance) {
    }

    record InventoryEntry(String itemKey, int quantity) {
    }
}
