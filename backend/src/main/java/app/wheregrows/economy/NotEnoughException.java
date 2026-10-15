package app.wheregrows.economy;

import app.wheregrows.common.ConflictException;

/** Не хватает ресурса. Ничего не списано и не потеряно — просто пока рано. */
public class NotEnoughException extends ConflictException {

    public NotEnoughException(String itemName, int needed, int available) {
        super("Не хватает: «" + itemName + "». Нужно " + needed + ", есть " + available + ".");
    }
}
