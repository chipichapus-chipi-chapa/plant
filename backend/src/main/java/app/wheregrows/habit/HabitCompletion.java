package app.wheregrows.habit;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Факт выполнения привычки в конкретный день. Пара (привычка, день) уникальна в базе —
 * это главная защита от повторной награды. Заодно запись хранит, что именно было начислено.
 */
@Entity
@Table(name = "habit_completion")
public class HabitCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "habit_id", nullable = false, updatable = false)
    private long habitId;

    @Column(name = "player_id", nullable = false, updatable = false)
    private long playerId;

    @Column(name = "completed_on", nullable = false, updatable = false)
    private LocalDate completedOn;

    @Column(name = "life_seeds", nullable = false, updatable = false)
    private int lifeSeeds;

    @Column(name = "shard_item_key", updatable = false)
    private String shardItemKey;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected HabitCompletion() {
    }

    HabitCompletion(long habitId, long playerId, LocalDate completedOn, int lifeSeeds, String shardItemKey) {
        this.habitId = habitId;
        this.playerId = playerId;
        this.completedOn = completedOn;
        this.lifeSeeds = lifeSeeds;
        this.shardItemKey = shardItemKey;
    }

    public long getHabitId() {
        return habitId;
    }

    public LocalDate getCompletedOn() {
        return completedOn;
    }
}
