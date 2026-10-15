package app.wheregrows.player;

import java.time.ZoneId;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Создаёт пользователя и профиль, если их ещё нет. Безопасно вызывать сколько угодно раз и параллельно. */
@Service
public class LocalPlayerProvisioner {

    private final AppUserRepository users;
    private final PlayerProfileRepository profiles;

    LocalPlayerProvisioner(AppUserRepository users, PlayerProfileRepository profiles) {
        this.users = users;
        this.profiles = profiles;
    }

    @Transactional
    public long provision(String username, String displayName, ZoneId timezone) {
        users.insertIfAbsent(username);
        long userId = users.findByUsername(username).orElseThrow().getId();
        profiles.insertIfAbsent(userId, displayName, timezone.getId());
        return userId;
    }
}
