package app.wheregrows.common;

/** Действие доступно не всем (например, кнопки тестирования). */
public class ForbiddenException extends GameException {

    public ForbiddenException(String detail) {
        super("Недоступно", detail);
    }
}
