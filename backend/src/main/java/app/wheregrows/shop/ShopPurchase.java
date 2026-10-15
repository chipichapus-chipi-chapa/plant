package app.wheregrows.shop;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Совершённая покупка. Пара (игрок, ключ идемпотентности) уникальна: одна покупка на одно намерение. */
@Entity
@Table(name = "shop_purchase")
public class ShopPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false, updatable = false)
    private long playerId;

    @Column(name = "idempotency_key", nullable = false, updatable = false)
    private UUID idempotencyKey;

    @Column(name = "item_key", nullable = false, updatable = false)
    private String itemKey;

    @Column(nullable = false, updatable = false)
    private int quantity;

    @Column(nullable = false, updatable = false)
    private int cost;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected ShopPurchase() {
    }

    ShopPurchase(long playerId, UUID idempotencyKey, String itemKey, int quantity, int cost) {
        this.playerId = playerId;
        this.idempotencyKey = idempotencyKey;
        this.itemKey = itemKey;
        this.quantity = quantity;
        this.cost = cost;
    }

    public String getItemKey() {
        return itemKey;
    }

    public int getQuantity() {
        return quantity;
    }

    public int getCost() {
        return cost;
    }
}
