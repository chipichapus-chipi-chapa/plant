package app.wheregrows.player;

import org.springframework.stereotype.Component;

import app.wheregrows.config.GameProperties;

/**
 * Локальный режим разработки: каждый запрос считается запросом единственного игрока.
 * Это не авторизация — поэтому сервер слушает только 127.0.0.1 (см. README).
 */
@Component
class LocalCurrentPlayer implements CurrentPlayer {

    private final LocalPlayerProvisioner provisioner;
    private final GameProperties.Local settings;
    private volatile Long cachedId;

    LocalCurrentPlayer(LocalPlayerProvisioner provisioner, GameProperties properties) {
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
}
