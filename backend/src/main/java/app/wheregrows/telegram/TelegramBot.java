package app.wheregrows.telegram;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import tools.jackson.databind.JsonNode;

/**
 * Бот игры. Своего процесса у него нет: Telegram присылает сообщения на этот же сервер (webhook),
 * а при старте сервер сам регистрирует webhook и кнопку меню «Играть» — настраивать в @BotFather нечего.
 */
@Component
@Conditional(TelegramMode.On.class)
class TelegramBot {

    static final String WEBHOOK_PATH = "/telegram/webhook";
    static final String PLAY = "Играть";
    static final String GREETING = """
            Добро пожаловать в сад «Там, где растёт» 🌱

            Заброшенный сад оживает вместе с вашими привычками: отмечайте маленькие дела — \
            и в саду распускаются цветы, просыпаются жители и открываются новые тропы.

            Нажмите «Играть», чтобы войти в сад.""";

    private static final Logger log = LoggerFactory.getLogger(TelegramBot.class);

    private final TelegramBotApi api;
    private final String secret;
    private final String publicUrl;
    private final String webAppUrl;

    TelegramBot(TelegramBotApi api,
                @Value("${" + TelegramMode.TOKEN_PROPERTY + "}") String botToken,
                @Value("${telegram.public-url:}") String publicUrl,
                @Value("${telegram.web-app-url:}") String webAppUrl) {
        this.api = api;
        // Секрет webhook выводится из токена: отдельная настройка не нужна, а снаружи его не угадать
        this.secret = HexFormat.of().formatHex(
                TelegramInitData.hmac("webhook".getBytes(StandardCharsets.UTF_8), botToken.trim())).substring(0, 48);
        this.publicUrl = publicUrl.replaceAll("/+$", "");
        this.webAppUrl = webAppUrl;
    }

    /** Render сам сообщает внешний адрес (RENDER_EXTERNAL_URL); локально его нет — и бот не регистрируется. */
    @EventListener(ApplicationReadyEvent.class)
    void register() {
        if (!StringUtils.hasText(publicUrl) || !StringUtils.hasText(webAppUrl)) {
            log.info("Бот не регистрируется: не заданы telegram.public-url и telegram.web-app-url");
            return;
        }
        try {
            api.setWebhook(publicUrl + WEBHOOK_PATH, secret);
            api.setMenuButton(PLAY, webAppUrl);
            log.info("Бот подключён: webhook и кнопка «{}»", PLAY);
        } catch (RuntimeException e) {
            // без бота игра всё равно работает — сервер не падает
            log.warn("Не удалось зарегистрировать бота в Telegram: {}", e.getMessage());
        }
    }

    /** Запрос действительно от Telegram: он возвращает секрет, который мы передали при регистрации. */
    boolean trusted(String headerSecret) {
        return headerSecret != null && MessageDigest.isEqual(
                secret.getBytes(StandardCharsets.UTF_8), headerSecret.getBytes(StandardCharsets.UTF_8));
    }

    /** На любое сообщение — приветствие с кнопкой входа в игру. */
    void handle(JsonNode update) {
        JsonNode chatId = update.path("message").path("chat").path("id");
        if (!chatId.canConvertToLong() || !StringUtils.hasText(webAppUrl)) {
            return;
        }
        api.sendWebAppButton(chatId.asLong(), GREETING, PLAY, webAppUrl);
    }
}
