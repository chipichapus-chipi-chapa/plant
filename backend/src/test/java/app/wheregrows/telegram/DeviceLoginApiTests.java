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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Приложение (PWA): вход без регистрации по ключу устройства и привязка сада к Telegram через бота. */
@Import({TestcontainersConfiguration.class, TelegramBotTests.FakeApi.class})
@SpringBootTest(properties = {
        "telegram.bot-token=" + DeviceLoginApiTests.TOKEN,
        "telegram.public-url=",
        "telegram.web-app-url=https://example.github.io/plant/"})
@AutoConfigureMockMvc
class DeviceLoginApiTests {

    static final String TOKEN = "888:device-tests";

    @Autowired
    MockMvc mvc;

    @Autowired
    TelegramBotTests.Recorder telegram;

    final JsonMapper json = JsonMapper.builder().build();

    String register() throws Exception {
        String body = mvc.perform(post("/api/auth/device").header(LoginFilter.TIMEZONE_HEADER, "Europe/Moscow"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asString();
    }

    JsonNode startLink(String device) throws Exception {
        String body = mvc.perform(post("/api/auth/telegram-link").header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body);
    }

    /** Человек с этим Telegram id нажимает «Старт» по ссылке из приложения. */
    void pressStart(String code, long telegramId) throws Exception {
        String update = """
                {"update_id": 1, "message": {"chat": {"id": %d}, "from": {"id": %d}, "text": "/start link_%s"}}"""
                .formatted(telegramId, telegramId, code);
        mvc.perform(post("/telegram/webhook")
                        .header("X-Telegram-Bot-Api-Secret-Token", secret())
                        .contentType("application/json")
                        .content(update))
                .andExpect(status().isOk());
    }

    static String secret() {
        return java.util.HexFormat.of().formatHex(TelegramInitData.hmac(
                "webhook".getBytes(java.nio.charset.StandardCharsets.UTF_8), TOKEN)).substring(0, 48);
    }

    static String telegramLogin(long id, String name) {
        return TelegramInitDataTests.signed(TOKEN, Map.of(
                "auth_date", String.valueOf(Instant.now().getEpochSecond()),
                "user", "{\"id\":" + id + ",\"first_name\":\"" + name + "\"}"));
    }

    @Test
    void appGetsItsOwnGardenWithoutSignUp() throws Exception {
        String device = register();

        mvc.perform(get("/api/state").header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.player.displayName").value("Садовник"))
                .andExpect(jsonPath("$.player.timezone").value("Europe/Moscow"));
        mvc.perform(get("/api/auth/account").header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(jsonPath("$.telegram").value(false));
    }

    @Test
    void installSiteGetsTheBotLinkWithoutLogin() throws Exception {
        mvc.perform(get("/api/auth/bot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://t.me/garden_test_bot"));
    }

    @Test
    void unknownOrBrokenDeviceKeyIsRejected() throws Exception {
        mvc.perform(get("/api/state").header(LoginFilter.DEVICE_HEADER, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/state").header(LoginFilter.DEVICE_HEADER, "not base64 !!"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void linkingNewTelegramKeepsTheAppGarden() throws Exception {
        String device = register();
        JsonNode link = startLink(device);
        String code = link.get("code").asString();
        assertThat(link.get("url").asString()).isEqualTo("https://t.me/garden_test_bot?start=link_" + code);

        pressStart(code, 7001);

        assertThat(telegram.calls).anyMatch(c -> c.startsWith("text 7001 Готово! Сад в приложении"));
        mvc.perform(get("/api/auth/telegram-link/" + code).header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(jsonPath("$.linked").value(true));
        mvc.perform(get("/api/auth/account").header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(jsonPath("$.telegram").value(true));
        // в боте теперь тот же сад, что был в приложении (имя из приложения, а не из Telegram)
        mvc.perform(get("/api/state").header(LoginFilter.INIT_DATA_HEADER, telegramLogin(7001, "Ёжик")))
                .andExpect(jsonPath("$.player.displayName").value("Садовник"));
    }

    @Test
    void linkingTelegramThatAlreadyPlaysSwitchesTheAppToThatGarden() throws Exception {
        mvc.perform(get("/api/state").header(LoginFilter.INIT_DATA_HEADER, telegramLogin(7002, "Мята")))
                .andExpect(jsonPath("$.player.displayName").value("Мята"));
        String device = register();
        String code = startLink(device).get("code").asString();

        pressStart(code, 7002);

        assertThat(telegram.calls).anyMatch(c -> c.startsWith("text 7002 Готово! В приложении теперь ваш сад"));
        mvc.perform(get("/api/state").header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(jsonPath("$.player.displayName").value("Мята"));
        mvc.perform(get("/api/auth/telegram-link/" + code).header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(jsonPath("$.linked").value(true));
    }

    @Test
    void codeWorksOnlyOnce() throws Exception {
        String device = register();
        String code = startLink(device).get("code").asString();
        pressStart(code, 7003);

        pressStart(code, 7004);

        assertThat(telegram.calls).anyMatch(c -> c.startsWith("text 7004 Ссылка устарела"));
        mvc.perform(post("/api/auth/telegram-link").header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(status().isConflict());
    }

    @Test
    void waitingForStartIsNotLinkedYet() throws Exception {
        String device = register();
        String code = startLink(device).get("code").asString();

        mvc.perform(get("/api/auth/telegram-link/" + code).header(LoginFilter.DEVICE_HEADER, device))
                .andExpect(jsonPath("$.linked").value(false));
    }
}
