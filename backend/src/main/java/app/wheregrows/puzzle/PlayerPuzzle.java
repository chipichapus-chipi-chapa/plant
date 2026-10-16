package app.wheregrows.puzzle;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Игрок разгадал загадку. Первичный ключ не даёт получить награду дважды. */
@Entity
@Table(name = "player_puzzle")
public class PlayerPuzzle {

    @EmbeddedId
    private Id id;

    @Column(name = "solved_at", nullable = false)
    private Instant solvedAt;

    @Embeddable
    public record Id(@Column(name = "player_id") Long playerId, @Column(name = "puzzle_key") String puzzleKey) {
    }

    protected PlayerPuzzle() {
    }

    PlayerPuzzle(long playerId, String puzzleKey, Instant solvedAt) {
        this.id = new Id(playerId, puzzleKey);
        this.solvedAt = solvedAt;
    }

    public String getPuzzleKey() {
        return id.puzzleKey();
    }
}
