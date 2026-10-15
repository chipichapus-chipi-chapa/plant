package app.wheregrows.common;

/** Данные запроса не проходят проверку, которую нельзя выразить аннотациями (например, неизвестная категория). */
public class InvalidRequestException extends GameException {

    public InvalidRequestException(String detail) {
        super("Проверьте данные", detail);
    }
}
