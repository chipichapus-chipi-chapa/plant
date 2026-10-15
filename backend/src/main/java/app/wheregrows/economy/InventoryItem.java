package app.wheregrows.economy;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Сколько предметов одного вида лежит у игрока. Строка на пару (игрок, предмет). */
@Entity
@Table(name = "inventory_item")
public class InventoryItem {

    @EmbeddedId
    private InventoryItemId id;

    @Column(nullable = false)
    private int quantity;

    protected InventoryItem() {
    }

    public String getItemKey() {
        return id.itemKey();
    }

    public int getQuantity() {
        return quantity;
    }
}
