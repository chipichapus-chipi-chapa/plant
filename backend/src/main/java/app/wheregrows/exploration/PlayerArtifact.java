package app.wheregrows.exploration;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Артефакт в коллекции игрока. Не расходуется: строка либо есть, либо нет. */
@Entity
@Table(name = "player_artifact")
public class PlayerArtifact {

    @EmbeddedId
    private Id id;

    @Column(name = "found_at", nullable = false)
    private Instant foundAt;

    @Column(name = "found_where", nullable = false)
    private String foundWhere;

    @Embeddable
    public record Id(@Column(name = "player_id") Long playerId, @Column(name = "artifact_key") String artifactKey) {
    }

    protected PlayerArtifact() {
    }

    PlayerArtifact(long playerId, String artifactKey, Instant foundAt, String foundWhere) {
        this.id = new Id(playerId, artifactKey);
        this.foundAt = foundAt;
        this.foundWhere = foundWhere;
    }

    public String getArtifactKey() {
        return id.artifactKey();
    }

    public Instant getFoundAt() {
        return foundAt;
    }

    public String getFoundWhere() {
        return foundWhere;
    }
}
