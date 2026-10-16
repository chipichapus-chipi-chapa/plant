package app.wheregrows.garden;

import java.util.List;
import java.util.Map;

/**
 * Карта локации (сад, сарай изнутри): тайлы задаются строками символов, легенда описывает каждый символ,
 * постройки (props) лежат поверх тайлов. Хранится как контент в resources/content/gardens.
 */
public record GardenMap(String key, String name, int width, int height, Map<String, TileType> tiles,
                        List<String> rows, List<Prop> props) {

    public record TileType(String type, String name, String description, boolean plantable) {
    }

    /**
     * Постройка или предмет на карте.
     *
     * @param door дверь в другую локацию (или null)
     * @param read текст, который можно прочитать, — например, письмо (или null)
     */
    public record Prop(String key, String kind, int x, int y, int width, int height, String name,
                       String description, Door door, String read) {
    }

    /** Дверь: на какую карту ведёт, в какую клетку и куда персонаж будет смотреть; label — надпись на кнопке. */
    public record Door(String map, int x, int y, String facing, String label) {
    }

    private static final java.util.Set<String> FACINGS = java.util.Set.of("up", "down", "left", "right");

    /** Тип тайла в клетке (x, y). */
    public TileType tileAt(int x, int y) {
        return tiles.get(String.valueOf(rows.get(y).charAt(x)));
    }

    /** Постройка, накрывающая клетку, или null. */
    public Prop propAt(int x, int y) {
        return props.stream()
                .filter(p -> x >= p.x() && y >= p.y() && x < p.x() + p.width() && y < p.y() + p.height())
                .findFirst().orElse(null);
    }

    public boolean contains(int x, int y) {
        return x >= 0 && y >= 0 && x < width && y < height;
    }

    /** Проверка целостности: ошибка в контенте должна ронять запуск, а не всплывать посреди игры. */
    void validate() {
        require(rows.size() == height, "строк карты " + rows.size() + ", а height = " + height);
        for (int y = 0; y < rows.size(); y++) {
            String row = rows.get(y);
            require(row.length() == width, "строка " + y + " длиной " + row.length() + ", а width = " + width);
            for (char c : row.toCharArray()) {
                require(tiles.containsKey(String.valueOf(c)), "символ '" + c + "' в строке " + y + " не описан в tiles");
            }
        }
        for (Prop prop : props) {
            require(contains(prop.x(), prop.y()) && contains(prop.x() + prop.width() - 1, prop.y() + prop.height() - 1),
                    "постройка " + prop.key() + " выходит за край карты");
        }
        require(props.stream().map(Prop::key).distinct().count() == props.size(), "ключи построек повторяются");
        for (Prop prop : props) {
            if (prop.door() != null) {
                require(FACINGS.contains(prop.door().facing()), "у двери " + prop.key() + " неизвестное направление " + prop.door().facing());
                require(prop.door().label() != null, "у двери " + prop.key() + " нет надписи на кнопке");
            }
        }
    }

    /** Клетки, где лежит тайл данного типа (например, все заросшие грядки). */
    public java.util.List<int[]> cellsOfType(String type) {
        java.util.List<int[]> cells = new java.util.ArrayList<>();
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if (tileAt(x, y).type().equals(type)) {
                    cells.add(new int[] {x, y});
                }
            }
        }
        return cells;
    }

    void require(boolean condition, String problem) {
        if (!condition) {
            throw new IllegalStateException("Карта сада «" + key + "»: " + problem);
        }
    }
}
