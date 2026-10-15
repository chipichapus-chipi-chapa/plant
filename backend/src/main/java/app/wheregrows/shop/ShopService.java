package app.wheregrows.shop;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.InvalidRequestException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.content.ItemDefinition;
import app.wheregrows.content.ItemDefinitionRepository;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Лавка: покупка предметов за Семена жизни. Цену и итог считает только сервер.
 * Списание, выдача предмета и запись покупки — одна транзакция: либо всё, либо ничего.
 */
@Service
public class ShopService {

    private final ShopPurchaseRepository purchases;
    private final ItemDefinitionRepository items;
    private final PlayerProfileRepository players;
    private final Inventory inventory;

    ShopService(ShopPurchaseRepository purchases, ItemDefinitionRepository items, PlayerProfileRepository players,
                Inventory inventory) {
        this.purchases = purchases;
        this.items = items;
        this.players = players;
        this.inventory = inventory;
    }

    @Transactional
    public PurchaseResult purchase(long playerId, UUID idempotencyKey, String itemKey, int quantity) {
        // Блокировка профиля выстраивает покупки игрока в очередь: повтор с тем же ключом
        // гарантированно увидит первую покупку, а не выполнит её второй раз.
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));

        Optional<ShopPurchase> earlier = purchases.findByPlayerIdAndIdempotencyKey(playerId, idempotencyKey);
        if (earlier.isPresent()) {
            ShopPurchase purchase = earlier.get();
            if (!purchase.getItemKey().equals(itemKey) || purchase.getQuantity() != quantity) {
                throw new ConflictException("Этот ключ покупки уже использован для другого товара.");
            }
            return PurchaseResult.of(purchase, true);
        }

        ItemDefinition item = items.findById(itemKey)
                .orElseThrow(() -> new NotFoundException("В лавке нет такого товара."));
        if (item.getPrice() == null) {
            throw new InvalidRequestException("«" + item.getName() + "» не продаётся.");
        }
        int cost = Math.multiplyExact(item.getPrice(), quantity);
        String currencyName = items.findById(Inventory.LIFE_SEED).map(ItemDefinition::getName).orElse("Семена жизни");

        inventory.spend(playerId, Inventory.LIFE_SEED, cost, currencyName);
        inventory.grant(playerId, List.of(new ItemGrant(itemKey, quantity)));
        return PurchaseResult.of(purchases.save(new ShopPurchase(playerId, idempotencyKey, itemKey, quantity, cost)), false);
    }
}
