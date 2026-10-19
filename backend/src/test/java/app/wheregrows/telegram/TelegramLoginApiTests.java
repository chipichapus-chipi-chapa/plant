package app.wheregrows.telegram;

import java.time.Instant;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import app.wheregrows.TestcontainersConfiguration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Режим Telegram Mini App: вход по подписанной initData, у каждого игрока свой прогресс. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
        "telegram.bot-token=" + TelegramLoginApiTests.TOKEN,
        // без адреса бот не регистрируется — тесты не ходят в настоящий Telegram
        "telegram.public-url=",
        "game.cors.allowed-origins=https://example.github.io",
        "game.testers=4242, 777000"})
@AutoConfigureMockMvc
class TelegramLoginApiTests {

    static final String TOKEN = "777:integration";
    static final String ORIGIN = "https://example.github.io";

    @Autowired
    MockMvc mvc;

    static String login(long id, String name) {
        return TelegramInitDataTests.signed(TOKEN, Map.of(
                "auth_date", String.valueOf(Instant.now().getEpochSecond()),
                "user", "{\"id\":" + id + ",\"first_name\":\"" + name + "\"}"));
    }

    @Test
    void requestWithoutLoginIsRejectedAndReadableByTheFrontend() throws Exception {
        mvc.perform(get("/api/state").header("Origin", ORIGIN))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN))
                .andExpect(jsonPath("$.title").value("Нужен вход"));
    }

    @Test
    void forgedLoginIsRejected() throws Exception {
        String forged = TelegramInitDataTests.signed("1:not-the-bot", Map.of(
                "auth_date", String.valueOf(Instant.now().getEpochSecond()),
                "user", "{\"id\":1,\"first_name\":\"Хмур\"}"));

        mvc.perform(get("/api/state").header(LoginFilter.INIT_DATA_HEADER, forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void firstLoginCreatesAProfileWithTelegramNameAndTimezone() throws Exception {
        mvc.perform(get("/api/state")
                        .header(LoginFilter.INIT_DATA_HEADER, login(9001, "Крупка"))
                        .header(LoginFilter.TIMEZONE_HEADER, "Europe/Moscow"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.player.displayName").value("Крупка"))
                .andExpect(jsonPath("$.player.timezone").value("Europe/Moscow"));
    }

    @Test
    void eachTelegramUserHasTheirOwnProgress() throws Exception {
        mvc.perform(get("/api/state").header(LoginFilter.INIT_DATA_HEADER, login(9002, "Мята")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/state").header(LoginFilter.INIT_DATA_HEADER, login(9003, "Шуршик")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.player.displayName").value("Шуршик"));
        mvc.perform(get("/api/state").header(LoginFilter.INIT_DATA_HEADER, login(9002, "Мята")))
                .andExpect(jsonPath("$.player.displayName").value("Мята"));
    }

    @Test
    void corsPreflightPassesWithoutLogin() throws Exception {
        mvc.perform(options("/api/state")
                        .header("Origin", ORIGIN)
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "X-Telegram-Init-Data"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN));
    }

    /** Все заголовки, которые шлёт фронтенд, должны быть разрешены — иначе браузер молча блокирует запрос. */
    @Test
    void corsAllowsEveryHeaderTheFrontendSends() throws Exception {
        mvc.perform(options("/api/shop/purchases")
                        .header("Origin", ORIGIN)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers",
                                "content-type,idempotency-key,x-telegram-init-data,x-timezone"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN));
    }

    @Test
    void androidAppMayCallTheServer() throws Exception {
        mvc.perform(options("/api/state")
                        .header("Origin", "https://localhost")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "x-device-token"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://localhost"));
    }

    @Test
    void testToolsAreClosedForOrdinaryPlayers() throws Exception {
        mvc.perform(get("/api/state").header(LoginFilter.INIT_DATA_HEADER, login(9010, "Гость")))
                .andExpect(jsonPath("$.tester").value(false));
        mvc.perform(post("/api/test/resources").header(LoginFilter.INIT_DATA_HEADER, login(9010, "Гость")))
                .andExpect(status().isForbidden());
    }

    @Test
    void testersAreListedByTelegramId() throws Exception {
        mvc.perform(get("/api/state").header(LoginFilter.INIT_DATA_HEADER, login(4242, "Тестировщик")))
                .andExpect(jsonPath("$.tester").value(true));
        mvc.perform(post("/api/test/resources").header(LoginFilter.INIT_DATA_HEADER, login(4242, "Тестировщик")))
                .andExpect(status().isNoContent());
    }

    @Test
    void healthStaysOpenForTheHosting() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }
}
