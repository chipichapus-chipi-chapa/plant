package app.wheregrows.economy;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, InventoryItemId> {

    /** Только то, что реально лежит в сумке: нулевые остатки не показываем. */
    List<InventoryItem> findByIdPlayerIdAndQuantityGreaterThanOrderByIdItemKey(long playerId, int quantity);
}
