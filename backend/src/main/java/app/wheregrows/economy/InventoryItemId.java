package app.wheregrows.economy;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public record InventoryItemId(
        @Column(name = "player_id") Long playerId,
        @Column(name = "item_key") String itemKey) {
}
