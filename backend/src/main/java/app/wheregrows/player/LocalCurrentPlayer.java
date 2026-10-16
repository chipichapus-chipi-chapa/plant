package app.wheregrows.player;

import java.net.InetAddress;
import java.net.UnknownHostException;

import org.springframework.context.annotation.Conditional;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import app.wheregrows.config.GameProperties;
import app.wheregrows.telegram.TelegramMode;

/**
 * Локальный режим разработки: каждый запрос считается запросом единственного игрока.
 * Это не авторизация — поэтому сервер слушает только 127.0.0.1 (см. README).
 * Если задан токен бота, вместо этого режима работает вход через Telegram.
 */
@Component
@Conditional(TelegramMode.Off.class)
class LocalCurrentPlayer implements CurrentPlayer {

    private final LocalPlayerProvisioner provisioner;
    private final GameProperties.Local settings;
    private volatile Long cachedId;

    LocalCurrentPlayer(LocalPlayerProvisioner provisioner, GameProperties properties, Environment environment) {
        requireLoopback(environment.getProperty("server.address"));
        this.provisioner = provisioner;
        this.settings = properties.local();
    }

    @Override
    public long id() {
        Long id = cachedId;
        if (id == null) {
            id = provisioner.provision(settings.username(), settings.displayName(), settings.timezone());
            cachedId = id;
        }
        return id;
    }

    /** Без входа сервер нельзя открывать в сеть: любой посетитель стал бы этим игроком. */
    static void requireLoopback(String address) {
        boolean loopback;
        try {
            loopback = address != null && InetAddress.getByName(address).isLoopbackAddress();
        } catch (UnknownHostException e) {
            loopback = false;
        }
        if (!loopback) {
            throw new IllegalStateException("Локальный режим без входа слушает только 127.0.0.1, а задан адрес "
                    + address + ". Для доступа из сети задайте TELEGRAM_BOT_TOKEN.");
        }
    }
}
