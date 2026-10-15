package app.wheregrows.common;

/** Ожидаемая игровая ошибка: её текст показывается игроку, поэтому он написан по-человечески. */
public abstract class GameException extends RuntimeException {

    private final String title;

    protected GameException(String title, String detail) {
        super(detail);
        this.title = title;
    }

    public String getTitle() {
        return title;
    }
}
