package app.wheregrows.habit;

import java.time.LocalDate;
import java.util.List;

/**
 * Месяц трекера привычек.
 *
 * @param month          "yyyy-MM"
 * @param daysInMonth    сколько дней в месяце
 * @param today          сегодня по поясу игрока (отметка за этот день — с наградой)
 * @param editableFrom   самый ранний день, который ещё можно отметить или снять
 * @param habits         активные привычки и дни месяца, в которые они отмечены
 */
public record HabitHistory(String month, int daysInMonth, LocalDate today, LocalDate editableFrom, List<Row> habits) {

    public record Row(long id, String title, String crystalCategory, List<Integer> days) {
    }
}
