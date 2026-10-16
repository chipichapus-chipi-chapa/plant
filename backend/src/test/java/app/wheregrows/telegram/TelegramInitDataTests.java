package app.wheregrows.telegram;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

class TelegramInitDataTests {

    static final String TOKEN = "123456:test-token";
    static final Instant NOW = Instant.parse("2026-10-16T12:00:00Z");

    final TelegramInitData initData = new TelegramInitData(TOKEN, Duration.ofDays(1),
            Clock.fixed(NOW, ZoneOffset.UTC), JsonMapper.builder().build());

    /** Подписывает поля так же, как это делает Telegram. */
    static String signed(String token, Map<String, String> fields) {
        String check = new TreeMap<>(fields).entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("\n"));
        byte[] secret = TelegramInitData.hmac("WebAppData".getBytes(StandardCharsets.UTF_8), token);
        String hash = HexFormat.of().formatHex(TelegramInitData.hmac(secret, check));
        return fields.entrySet().stream()
                .map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&")) + "&hash=" + hash;
    }

    static Map<String, String> fields(Instant authDate) {
        return Map.of(
                "auth_date", String.valueOf(authDate.getEpochSecond()),
                "query_id", "AAH",
                "user", "{\"id\":42,\"first_name\":\"Мята\",\"language_code\":\"ru\"}");
    }

    @Test
    void acceptsDataSignedWithTheBotToken() {
        var user = initData.verify(signed(TOKEN, fields(NOW.minusSeconds(60))));

        assertThat(user).contains(new TelegramInitData.User(42, "Мята"));
    }

    @Test
    void rejectsDataSignedWithAnotherToken() {
        assertThat(initData.verify(signed("999:other", fields(NOW)))).isEmpty();
    }

    @Test
    void rejectsTamperedUser() {
        String data = signed(TOKEN, fields(NOW)).replace("%3A42%2C", "%3A43%2C");

        assertThat(initData.verify(data)).isEmpty();
    }

    @Test
    void rejectsStaleData() {
        assertThat(initData.verify(signed(TOKEN, fields(NOW.minus(Duration.ofDays(2)))))).isEmpty();
    }

    @Test
    void rejectsGarbage() {
        assertThat(initData.verify(null)).isEmpty();
        assertThat(initData.verify("")).isEmpty();
        assertThat(initData.verify("user=x&hash=zz")).isEmpty();
        assertThat(initData.verify("no-equals")).isEmpty();
    }
}
