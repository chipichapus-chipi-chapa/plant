package app.wheregrows.mentor;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Что уже случилось с игроком в истории: строка есть — флаг стоит. */
@Entity
@Table(name = "player_flag")
public class PlayerFlag {

    @EmbeddedId
    private Id id;

    @Column(name = "set_at", nullable = false)
    private Instant setAt;

    @Embeddable
    public record Id(@Column(name = "player_id") Long playerId, @Column(name = "flag") String flag) {
    }

    protected PlayerFlag() {
    }

    public PlayerFlag(long playerId, String flag, Instant setAt) {
        this.id = new Id(playerId, flag);
        this.setAt = setAt;
    }

    public String getFlag() {
        return id.flag();
    }
}
