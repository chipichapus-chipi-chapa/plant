package app.wheregrows.player;

/**
 * Кто делает текущий запрос. Единственное место, которое поменяется при появлении входа:
 * сейчас это локальный игрок, потом — пользователь из сессии Spring Security.
 */
public interface CurrentPlayer {

    long id();
}
