package app.wheregrows.exploration;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Игрок уже обыскал это место. Первичный ключ не даёт найти одно и то же дважды. */
@Entity
@Table(name = "player_discovery")
public class PlayerDiscovery {

    @EmbeddedId
    private Id id;

    @Column(name = "found_at", nullable = false)
    private Instant foundAt;

    @Embeddable
    public record Id(@Column(name = "player_id") Long playerId, @Column(name = "spot_key") String spotKey) {
    }

    protected PlayerDiscovery() {
    }

    PlayerDiscovery(long playerId, String spotKey, Instant foundAt) {
        this.id = new Id(playerId, spotKey);
        this.foundAt = foundAt;
    }

    public String getSpotKey() {
        return id.spotKey();
    }
}
