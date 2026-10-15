package app.wheregrows.economy;

/** «Предмет × количество» — из таких строк состоит любая награда. */
public record ItemGrant(String itemKey, int quantity) {

    public ItemGrant {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Количество в награде должно быть положительным: " + quantity);
        }
    }
}
