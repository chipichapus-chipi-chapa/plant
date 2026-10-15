package app.wheregrows.economy;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Единственная точка изменения инвентаря. Вызывается только внутри транзакции вызывающей операции. */
@Service
public class Inventory {

    /** Ключ основной валюты в каталоге. */
    public static final String LIFE_SEED = "life_seed";

    private final InventoryItemRepository items;

    Inventory(InventoryItemRepository items) {
        this.items = items;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void grant(long playerId, List<ItemGrant> grants) {
        for (ItemGrant grant : grants) {
            items.add(playerId, grant.itemKey(), grant.quantity());
        }
    }

    /**
     * Списывает предметы или бросает {@link NotEnoughException}, ничего не меняя.
     * Баланс уйти в минус не может: проверка и вычитание выполняются одним запросом,
     * а CHECK (quantity >= 0) в базе страхует от ошибки в коде.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void spend(long playerId, String itemKey, int quantity, String itemName) {
        if (items.trySpend(playerId, itemKey, quantity) == 0) {
            throw new NotEnoughException(itemName, quantity, items.quantityOf(playerId, itemKey));
        }
    }
}
