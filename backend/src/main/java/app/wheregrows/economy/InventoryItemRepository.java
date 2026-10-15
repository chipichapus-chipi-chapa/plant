package app.wheregrows.economy;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, InventoryItemId> {

    /** Только то, что реально лежит в сумке: нулевые остатки не показываем. */
    List<InventoryItem> findByIdPlayerIdAndQuantityGreaterThanOrderByIdItemKey(long playerId, int quantity);

    /** Атомарно добавляет предметы: создаёт строку или увеличивает количество одним запросом. */
    @Modifying
    @Query(value = """
            INSERT INTO inventory_item (player_id, item_key, quantity)
            VALUES (:playerId, :itemKey, :quantity)
            ON CONFLICT (player_id, item_key)
            DO UPDATE SET quantity = inventory_item.quantity + EXCLUDED.quantity""", nativeQuery = true)
    void add(@Param("playerId") long playerId, @Param("itemKey") String itemKey, @Param("quantity") int quantity);

    /**
     * Атомарно списывает, только если хватает: условие и вычитание — в одном UPDATE.
     * Возвращает число изменённых строк: 1 — списано, 0 — не хватило (ничего не изменилось).
     */
    @Modifying
    @Query(value = """
            UPDATE inventory_item SET quantity = quantity - :quantity
            WHERE player_id = :playerId AND item_key = :itemKey AND quantity >= :quantity""", nativeQuery = true)
    int trySpend(@Param("playerId") long playerId, @Param("itemKey") String itemKey, @Param("quantity") int quantity);

    @Query(value = """
            SELECT coalesce(max(quantity), 0) FROM inventory_item
            WHERE player_id = :playerId AND item_key = :itemKey""", nativeQuery = true)
    int quantityOf(@Param("playerId") long playerId, @Param("itemKey") String itemKey);
}
