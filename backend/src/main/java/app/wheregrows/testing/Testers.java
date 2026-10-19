package app.wheregrows.testing;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import app.wheregrows.telegram.TelegramMode;

/**
 * Кому доступны кнопки тестирования. Локально (без входа) — всегда: это компьютер разработчика.
 * На сервере — только Telegram id из {@code GAME_TESTERS} (через запятую); id подскажет бот по команде /id.
 * Остальные игроки кнопок не видят, а сервер отвечает им 403.
 */
@Component
public class Testers {

    private final boolean local;
    private final List<String> usernames;
    private final JdbcClient db;

    Testers(Environment environment, @Value("${game.testers:}") List<String> telegramIds, JdbcClient db) {
        this.local = !TelegramMode.enabled(environment);
        this.usernames = telegramIds.stream().map(String::trim).filter(s -> !s.isEmpty()).map(id -> "tg:" + id).toList();
        this.db = db;
    }

    public boolean isTester(long playerId) {
        if (local) {
            return true;
        }
        if (usernames.isEmpty()) {
            return false;
        }
        return db.sql("SELECT username FROM app_user WHERE id = ?").param(playerId).query(String.class)
                .optional().map(usernames::contains).orElse(false);
    }
}
