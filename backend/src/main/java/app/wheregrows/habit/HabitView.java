package app.wheregrows.habit;

/** Привычка так, как её видит клиент. */
public record HabitView(long id, String title, String crystalCategory, boolean doneToday) {

    static HabitView of(Habit habit, boolean doneToday) {
        return new HabitView(habit.getId(), habit.getTitle(), habit.getCrystalCategory(), doneToday);
    }
}
