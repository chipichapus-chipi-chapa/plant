package app.wheregrows.telegram;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.web.servlet.MockMvc;

import app.wheregrows.TestcontainersConfiguration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Бот: при старте регистрирует webhook и кнопку меню, на сообщения отвечает кнопкой «Играть». */
@Import({TestcontainersConfiguration.class, TelegramBotTests.FakeApi.class})
@SpringBootTest(properties = {
        "telegram.bot-token=" + TelegramBotTests.TOKEN,
        "telegram.public-url=https://garden.example/",
        "telegram.web-app-url=https://example.github.io/plant/"})
@AutoConfigureMockMvc
class TelegramBotTests {

    static final String TOKEN = "555:bot-tests";

    /** Вместо Telegram — запись вызовов. */
    static class Recorder implements TelegramBotApi {
        final List<String> calls = new ArrayList<>();

        @Override
        public void sendWebAppButton(long chatId, String text, String buttonText, String webAppUrl) {
            calls.add("send " + chatId + " " + buttonText + " " + webAppUrl);
        }

        @Override
        public void setWebhook(String url, String secret) {
            calls.add("webhook " + url + " " + secret.equals(secret()));
        }

        @Override
        public void setMenuButton(String text, String webAppUrl) {
            calls.add("menu " + text + " " + webAppUrl);
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FakeApi {
        @Bean
        @Primary
        Recorder recorder() {
            return new Recorder();
        }
    }

    static String secret() {
        return HexFormat.of().formatHex(
                TelegramInitData.hmac("webhook".getBytes(StandardCharsets.UTF_8), TOKEN)).substring(0, 48);
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    Recorder telegram;

    @Test
    void startupRegistersWebhookAndMenuButton() {
        assertThat(telegram.calls).contains(
                "webhook https://garden.example/telegram/webhook true",
                "menu Играть https://example.github.io/plant/");
    }

    @Test
    void startMessageIsAnsweredWithPlayButton() throws Exception {
        mvc.perform(post("/telegram/webhook")
                        .header("X-Telegram-Bot-Api-Secret-Token", secret())
                        .contentType("application/json")
                        .content("{\"update_id\":1,\"message\":{\"chat\":{\"id\":321},\"text\":\"/start\"}}"))
                .andExpect(status().isOk());

        assertThat(telegram.calls).contains("send 321 Играть https://example.github.io/plant/");
    }

    @Test
    void requestsWithoutTheSecretAreRejected() throws Exception {
        mvc.perform(post("/telegram/webhook")
                        .header("X-Telegram-Bot-Api-Secret-Token", "guess")
                        .contentType("application/json")
                        .content("{\"message\":{\"chat\":{\"id\":999},\"text\":\"/start\"}}"))
                .andExpect(status().isForbidden());

        assertThat(telegram.calls).noneMatch(call -> call.startsWith("send 999"));
    }
}
