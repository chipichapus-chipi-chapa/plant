package app.wheregrows.garden;

import java.util.List;
import java.util.Map;

/**
 * Карта сада: тайлы задаются строками символов, легенда описывает каждый символ,
 * постройки (props) лежат поверх тайлов. Хранится как контент в resources/content/gardens.
 */
public record GardenMap(String key, String name, int width, int height, Map<String, TileType> tiles,
                        List<String> rows, List<Prop> props) {

    public record TileType(String type, String name, String description, boolean plantable) {
    }

    public record Prop(String key, String kind, int x, int y, int width, int height, String name,
                       String description) {
    }

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
    }

    private void require(boolean condition, String problem) {
        if (!condition) {
            throw new IllegalStateException("Карта сада «" + key + "»: " + problem);
        }
    }
}
