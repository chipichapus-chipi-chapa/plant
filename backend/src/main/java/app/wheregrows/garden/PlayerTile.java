package app.wheregrows.garden;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * Клетка карты, изменённая игроком. Сейчас единственное изменение — прополка заросшей грядки:
 * такая клетка дальше ведёт себя как обычная грядка. Первичный ключ не даёт прополоть её дважды.
 */
@Entity
@Table(name = "player_tile")
public class PlayerTile {

    public static final String WEEDED = "WEEDED";

    @EmbeddedId
    private Id id;

    @Column(nullable = false)
    private String state;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @Embeddable
    public record Id(@Column(name = "player_id") Long playerId, @Column(name = "garden_key") String gardenKey,
                     @Column(name = "x") Short x, @Column(name = "y") Short y) {
    }

    protected PlayerTile() {
    }

    PlayerTile(long playerId, String gardenKey, int x, int y, String state, Instant changedAt) {
        this.id = new Id(playerId, gardenKey, (short) x, (short) y);
        this.state = state;
        this.changedAt = changedAt;
    }

    public int getX() {
        return id.x();
    }

    public int getY() {
        return id.y();
    }
}
