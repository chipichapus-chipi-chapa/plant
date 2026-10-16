package app.wheregrows.telegram;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Проверка строки initData, которую Telegram передаёт Mini App.
 * <p>
 * Telegram подписывает её ключом бота: secret = HMAC_SHA256("WebAppData", token),
 * hash = hex(HMAC_SHA256(secret, data_check_string)), где data_check_string — все поля,
 * кроме hash, в виде {@code key=value}, отсортированные по ключу и склеенные через {@code \n}.
 * Подделать строку без токена бота нельзя, поэтому ей можно верить как входу.
 * Токен живёт только на сервере.
 */
public final class TelegramInitData {

    /** Кто открыл игру. Имя — для профиля при первом входе. */
    public record User(long id, String firstName) {
    }

    private final byte[] secret;
    private final Duration maxAge;
    private final Clock clock;
    private final JsonMapper json;

    public TelegramInitData(String botToken, Duration maxAge, Clock clock, JsonMapper json) {
        this.secret = hmac("WebAppData".getBytes(StandardCharsets.UTF_8), botToken);
        this.maxAge = maxAge;
        this.clock = clock;
        this.json = json;
    }

    /** Пользователь из подписанной строки; пусто — если подпись неверна, строка устарела или испорчена. */
    public Optional<User> verify(String initData) {
        if (initData == null || initData.isBlank()) {
            return Optional.empty();
        }
        Map<String, String> fields = new TreeMap<>();
        for (String pair : initData.split("&")) {
            int eq = pair.indexOf('=');
            if (eq <= 0) {
                return Optional.empty();
            }
            fields.put(decode(pair.substring(0, eq)), decode(pair.substring(eq + 1)));
        }
        String hash = fields.remove("hash");
        if (hash == null) {
            return Optional.empty();
        }
        StringBuilder check = new StringBuilder();
        fields.forEach((key, value) -> {
            if (!check.isEmpty()) {
                check.append('\n');
            }
            check.append(key).append('=').append(value);
        });
        byte[] expected = hmac(secret, check.toString());
        byte[] actual;
        try {
            actual = HexFormat.of().parseHex(hash);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        // Сравнение за постоянное время: по времени ответа нельзя подбирать подпись
        if (!MessageDigest.isEqual(expected, actual)) {
            return Optional.empty();
        }
        return fresh(fields.get("auth_date")) ? user(fields.get("user")) : Optional.empty();
    }

    private boolean fresh(String authDate) {
        try {
            Instant signedAt = Instant.ofEpochSecond(Long.parseLong(authDate));
            return !signedAt.plus(maxAge).isBefore(clock.instant());
        } catch (NumberFormatException | NullPointerException e) {
            return false;
        }
    }

    private Optional<User> user(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        try {
            JsonNode node = json.readTree(raw);
            JsonNode id = node.get("id");
            if (id == null || !id.canConvertToLong()) {
                return Optional.empty();
            }
            JsonNode name = node.get("first_name");
            return Optional.of(new User(id.asLong(), name == null ? "" : name.asString()));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }

    static byte[] hmac(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HmacSHA256 недоступен", e);
        }
    }
}
