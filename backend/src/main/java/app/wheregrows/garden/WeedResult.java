package app.wheregrows.garden;

/** Итог прополки: какая клетка стала грядкой и сколько заросших клеток осталось в саду. */
public record WeedResult(int x, int y, int remaining) {
}
