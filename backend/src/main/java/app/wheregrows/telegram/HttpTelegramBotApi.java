package app.wheregrows.telegram;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Conditional;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.JsonNode;

/** Bot API поверх HTTPS. Токен — часть адреса (так устроен Telegram), поэтому адреса не логируются. */
@Component
@Conditional(TelegramMode.On.class)
class HttpTelegramBotApi implements TelegramBotApi {

    private final RestClient http;

    HttpTelegramBotApi(@Value("${" + TelegramMode.TOKEN_PROPERTY + "}") String botToken) {
        this.http = RestClient.builder().baseUrl("https://api.telegram.org/bot" + botToken.trim() + "/").build();
    }

    @Override
    public void sendWebAppButton(long chatId, String text, String buttonText, String webAppUrl) {
        call("sendMessage", Map.of(
                "chat_id", chatId,
                "text", text,
                "reply_markup", Map.of("inline_keyboard",
                        List.of(List.of(Map.of("text", buttonText, "web_app", Map.of("url", webAppUrl)))))));
    }

    @Override
    public void setWebhook(String url, String secret) {
        call("setWebhook", Map.of("url", url, "secret_token", secret, "allowed_updates", List.of("message")));
    }

    @Override
    public void setMenuButton(String text, String webAppUrl) {
        call("setChatMenuButton", Map.of("menu_button",
                Map.of("type", "web_app", "text", text, "web_app", Map.of("url", webAppUrl))));
    }

    @Override
    public void sendText(long chatId, String text) {
        call("sendMessage", Map.of("chat_id", chatId, "text", text));
    }

    @Override
    public String username() {
        JsonNode me = http.post().uri("getMe").retrieve().body(JsonNode.class);
        return me == null ? null : me.path("result").path("username").asString(null);
    }

    private void call(String method, Map<String, ?> body) {
        http.post().uri(method).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().toBodilessEntity();
    }
}
