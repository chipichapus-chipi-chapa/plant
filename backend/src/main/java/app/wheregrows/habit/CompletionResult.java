package app.wheregrows.habit;

import java.time.LocalDate;
import java.util.List;

import app.wheregrows.economy.ItemGrant;

/**
 * Итог отметки привычки.
 *
 * @param newlyCompleted   true — отметка создана сейчас; false — она уже была сегодня
 * @param reward           что начислено этим запросом (пусто при повторе или сверх лимита)
 * @param dailyLimitReached отметка засчитана, но дневной лимит наград уже исчерпан
 */
public record CompletionResult(long habitId, LocalDate day, boolean newlyCompleted, List<ItemGrant> reward,
                               boolean dailyLimitReached) {

    static CompletionResult completed(long habitId, LocalDate day, List<ItemGrant> reward, boolean withinDailyLimit) {
        return new CompletionResult(habitId, day, true, reward, !withinDailyLimit);
    }

    static CompletionResult alreadyDone(long habitId, LocalDate day) {
        return new CompletionResult(habitId, day, false, List.of(), false);
    }
}
