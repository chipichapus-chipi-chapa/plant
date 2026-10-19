package app.wheregrows.telegram;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.ZoneId;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import org.springframework.context.annotation.Conditional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.player.LocalPlayerProvisioner;

/**
 * Игроки приложения (PWA), которые не открывали игру из Telegram.
 * <p>
 * Вход без регистрации: при первом запуске приложение получает случайный ключ устройства
 * и дальше шлёт его в каждом запросе. В базе хранится только SHA-256 ключа.
 * <p>
 * Привязка к Telegram: приложение получает одноразовый код и открывает бота по ссылке
 * {@code t.me/<бот>?start=link_<код>}. Бот видит, кто нажал «Старт», и связывает сад с этим Telegram:
 * если у человека ещё нет сада в боте — сад устройства становится его садом; если есть —
 * устройство переключается на сад из Telegram (а пустой анонимный сад удаляется).
 */
@Service
@Conditional(TelegramMode.On.class)
public class DeviceAccounts {

    /** Код живёт недолго: его нужно лишь донести от приложения до бота. */
    static final Duration LINK_TTL = Duration.ofMinutes(15);
    static final String DEVICE_PREFIX = "dev:";
    static final String TELEGRAM_PREFIX = "tg:";

    public enum LinkResult {
        /** Сад приложения стал садом этого Telegram */
        LINKED,
        /** Приложение переключилось на уже существующий сад из Telegram */
        SWITCHED,
        /** Код неизвестен, уже использован или устарел */
        EXPIRED
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient db;
    private final LocalPlayerProvisioner provisioner;

    DeviceAccounts(JdbcClient db, LocalPlayerProvisioner provisioner) {
        this.db = db;
        this.provisioner = provisioner;
    }

    /** Новый игрок со своим садом; возвращает ключ устройства (показывается один раз). */
    @Transactional
    public String register(ZoneId timezone) {
        long userId = provisioner.provision(DEVICE_PREFIX + UUID.randomUUID(), "Садовник", timezone);
        byte[] token = randomBytes(32);
        db.sql("INSERT INTO device_token (token_hash, user_id) VALUES (?, ?)")
                .params(sha256(token), userId)
                .update();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(token);
    }

    /** Игрок по ключу устройства; пусто — ключ неизвестен или испорчен. */
    public Optional<Long> playerFor(String token) {
        byte[] raw;
        try {
            raw = Base64.getUrlDecoder().decode(token);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        if (raw.length != 32) {
            return Optional.empty();
        }
        return db.sql("SELECT user_id FROM device_token WHERE token_hash = ?")
                .param(sha256(raw))
                .query(Long.class)
                .optional();
    }

    /** Связан ли сад игрока с Telegram. */
    public boolean linkedToTelegram(long userId) {
        return username(userId).startsWith(TELEGRAM_PREFIX);
    }

    /** Одноразовый код привязки для ссылки на бота. */
    public String newLinkCode(long userId) {
        String code = HexFormat.of().formatHex(randomBytes(16));
        db.sql("INSERT INTO telegram_link_code (code, user_id) VALUES (?, ?)").params(code, userId).update();
        return code;
    }

    /** Привязка по коду завершена — и именно для этого игрока (после переключения он уже «телеграмовский»). */
    public boolean linked(String code, long userId) {
        return db.sql("SELECT count(*) FROM telegram_link_code WHERE code = ? AND user_id = ? AND linked_at IS NOT NULL")
                .params(code, userId)
                .query(Long.class)
                .single() > 0;
    }

    /** Человек с этим Telegram id нажал «Старт» по ссылке с кодом. */
    @Transactional
    public LinkResult link(String code, long telegramId) {
        Optional<Long> owner = db.sql("""
                        SELECT user_id FROM telegram_link_code
                        WHERE code = ? AND linked_at IS NULL AND created_at > now() - make_interval(secs => ?)
                        FOR UPDATE""")
                .params(code, LINK_TTL.toSeconds())
                .query(Long.class)
                .optional();
        if (owner.isEmpty()) {
            return LinkResult.EXPIRED;
        }
        long deviceUser = owner.get();
        if (!username(deviceUser).startsWith(DEVICE_PREFIX)) {
            // сад уже связан с каким-то Telegram — перепривязать его чужим кодом нельзя
            return LinkResult.EXPIRED;
        }
        String telegramUser = TELEGRAM_PREFIX + telegramId;
        Optional<Long> existing = db.sql("SELECT id FROM app_user WHERE username = ?")
                .param(telegramUser)
                .query(Long.class)
                .optional();

        if (existing.isEmpty() || existing.get() == deviceUser) {
            // В боте сада ещё нет — сад приложения становится садом этого Telegram
            db.sql("UPDATE app_user SET username = ? WHERE id = ?").params(telegramUser, deviceUser).update();
            markLinked(code, deviceUser);
            return LinkResult.LINKED;
        }

        // Сад в боте уже есть — все устройства этого игрока переключаются на него
        long target = existing.get();
        db.sql("UPDATE device_token SET user_id = ? WHERE user_id = ?").params(target, deviceUser).update();
        markLinked(code, target);
        // анонимный сад больше никому не принадлежит; всё остальное удалится каскадом
        db.sql("DELETE FROM app_user WHERE id = ?").param(deviceUser).update();
        return LinkResult.SWITCHED;
    }

    private void markLinked(String code, long userId) {
        db.sql("UPDATE telegram_link_code SET linked_at = now(), user_id = ? WHERE code = ?").params(userId, code).update();
    }

    private String username(long userId) {
        return db.sql("SELECT username FROM app_user WHERE id = ?").param(userId).query(String.class).single();
    }

    private static byte[] randomBytes(int n) {
        byte[] bytes = new byte[n];
        RANDOM.nextBytes(bytes);
        return bytes;
    }

    static byte[] sha256(byte[] data) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(data);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 недоступен", e);
        }
    }
}
