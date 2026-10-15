package app.wheregrows.common;

/** Действие противоречит текущему состоянию игры (дубль названия, лимит и т.п.). */
public class ConflictException extends GameException {

    public ConflictException(String detail) {
        super("Так не получится", detail);
    }
}
