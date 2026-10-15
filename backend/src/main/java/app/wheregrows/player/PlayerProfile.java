package app.wheregrows.player;

import java.time.Instant;
import java.time.ZoneId;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Игровой профиль. Ключ совпадает с id пользователя; в остальных таблицах он называется player_id.
 * Ресурсы (включая Семена жизни) хранятся не здесь, а в инвентаре.
 */
@Entity
@Table(name = "player_profile")
public class PlayerProfile {

    @Id
    @Column(name = "user_id")
    private Long id;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(nullable = false)
    private String timezone;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected PlayerProfile() {
    }

    public Long getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public ZoneId getZone() {
        return ZoneId.of(timezone);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
