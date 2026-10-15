package app.wheregrows.habit;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Привычка, которую игрок придумал сам. Не удаляется, а уходит в архив вместе с историей. */
@Entity
@Table(name = "habit")
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false, updatable = false)
    private long playerId;

    @Column(nullable = false)
    private String title;

    /** Ключ категории кристалла; null — привычка приносит только Семена жизни. */
    @Column(name = "crystal_category")
    private String crystalCategory;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "archived_at")
    private Instant archivedAt;

    protected Habit() {
    }

    Habit(long playerId, String title, String crystalCategory) {
        this.playerId = playerId;
        this.title = title;
        this.crystalCategory = crystalCategory;
    }

    void update(String title, String crystalCategory) {
        this.title = title;
        this.crystalCategory = crystalCategory;
    }

    void archive(Instant at) {
        this.archivedAt = at;
    }

    public Long getId() {
        return id;
    }

    public long getPlayerId() {
        return playerId;
    }

    public String getTitle() {
        return title;
    }

    public String getCrystalCategory() {
        return crystalCategory;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }
}
