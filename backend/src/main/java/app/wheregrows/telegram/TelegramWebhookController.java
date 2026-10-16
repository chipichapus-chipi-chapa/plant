package app.wheregrows.telegram;

import org.springframework.context.annotation.Conditional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import tools.jackson.databind.JsonNode;

/** Сюда Telegram присылает сообщения боту. Чужие запросы (без секрета) отклоняются. */
@RestController
@Conditional(TelegramMode.On.class)
class TelegramWebhookController {

    private final TelegramBot bot;

    TelegramWebhookController(TelegramBot bot) {
        this.bot = bot;
    }

    @PostMapping(TelegramBot.WEBHOOK_PATH)
    ResponseEntity<Void> update(@RequestHeader(name = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
                                @RequestBody JsonNode update) {
        if (!bot.trusted(secret)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        bot.handle(update);
        // 200 даже если ответить не вышло: иначе Telegram будет повторять то же сообщение
        return ResponseEntity.ok().build();
    }
}
