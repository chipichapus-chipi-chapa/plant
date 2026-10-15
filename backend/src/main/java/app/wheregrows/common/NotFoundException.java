package app.wheregrows.common;

/** Запрошенного объекта нет — или он принадлежит другому игроку (не раскрываем, что он существует). */
public class NotFoundException extends GameException {

    public NotFoundException(String detail) {
        super("Не найдено", detail);
    }
}
