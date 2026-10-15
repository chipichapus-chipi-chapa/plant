package app.wheregrows.magic;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Состояние объекта мира у игрока. Строки нет — объект спит. */
@Entity
@Table(name = "player_world_object")
public class WorldObjectState {

    public static final String AWAKENED = "AWAKENED";

    @EmbeddedId
    private Id id;

    @Column(nullable = false)
    private String state;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @Embeddable
    public record Id(@Column(name = "player_id") Long playerId, @Column(name = "object_key") String objectKey) {
    }

    protected WorldObjectState() {
    }

    WorldObjectState(long playerId, String objectKey, String state, Instant changedAt) {
        this.id = new Id(playerId, objectKey);
        this.state = state;
        this.changedAt = changedAt;
    }

    public String getObjectKey() {
        return id.objectKey();
    }

    public String getState() {
        return state;
    }
}
