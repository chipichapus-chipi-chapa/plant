package app.wheregrows.player;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Выбранный игроком вариант в одном слоте внешности. */
@Entity
@Table(name = "player_appearance")
public class PlayerAppearance {

    @EmbeddedId
    private Id id;

    @Column(name = "option_key", nullable = false)
    private String optionKey;

    @Embeddable
    public record Id(@Column(name = "player_id") Long playerId, @Column(name = "slot_key") String slotKey) {
    }

    protected PlayerAppearance() {
    }

    PlayerAppearance(long playerId, String slotKey, String optionKey) {
        this.id = new Id(playerId, slotKey);
        this.optionKey = optionKey;
    }

    void choose(String optionKey) {
        this.optionKey = optionKey;
    }

    public String getSlotKey() {
        return id.slotKey();
    }

    public String getOptionKey() {
        return optionKey;
    }
}
