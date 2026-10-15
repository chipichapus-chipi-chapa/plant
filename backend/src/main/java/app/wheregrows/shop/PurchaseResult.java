package app.wheregrows.shop;

/**
 * Итог покупки.
 *
 * @param cost     сколько Семян жизни списано
 * @param replayed true — это повтор уже выполненной покупки, повторно ничего не списано
 */
public record PurchaseResult(String itemKey, int quantity, int cost, boolean replayed) {

    static PurchaseResult of(ShopPurchase purchase, boolean replayed) {
        return new PurchaseResult(purchase.getItemKey(), purchase.getQuantity(), purchase.getCost(), replayed);
    }
}
