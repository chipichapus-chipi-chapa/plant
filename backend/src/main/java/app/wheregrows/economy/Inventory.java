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
}
