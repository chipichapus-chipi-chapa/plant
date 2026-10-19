package app.wheregrows.telegram;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.context.annotation.Conditional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.common.ConflictException;
import app.wheregrows.player.CurrentPlayer;

/** Вход в приложении без регистрации и привязка сада к Telegram. */
@RestController
@RequestMapping("/api/auth")
@Conditional(TelegramMode.On.class)
class AccountController {

    private final DeviceAccounts devices;
    private final CurrentPlayer player;
    private final TelegramBot bot;

    AccountController(DeviceAccounts devices, CurrentPlayer player, TelegramBot bot) {
        this.devices = devices;
        this.player = player;
        this.bot = bot;
    }

    record DeviceLogin(String token) {
    }

    record Account(boolean telegram) {
    }

    record LinkStart(String code, String url) {
    }

    record LinkStatus(boolean linked) {
    }

    /** Первый запуск приложения: новый сад и ключ устройства (единственный раз, когда ключ уходит с сервера). */
    @PostMapping("/device")
    ResponseEntity<DeviceLogin> register(HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new DeviceLogin(devices.register(LoginFilter.timezone(request))));
    }

    @GetMapping("/account")
    Account account() {
        return new Account(devices.linkedToTelegram(player.id()));
    }

    /** Ссылка на бота с одноразовым кодом: «Старт» в боте свяжет этот сад с Telegram. */
    @PostMapping("/telegram-link")
    ResponseEntity<?> startLink() {
        if (devices.linkedToTelegram(player.id())) {
            throw new ConflictException("Сад уже связан с Telegram.");
        }
        String username = bot.username();
        if (username == null) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
                    "Не получилось связаться с ботом. Попробуйте позже.");
            problem.setTitle("Бот недоступен");
            return ResponseEntity.of(problem).build();
        }
        String code = devices.newLinkCode(player.id());
        return ResponseEntity.ok(new LinkStart(code, "https://t.me/" + username + "?start=" + TelegramBot.LINK_PREFIX + code));
    }

    @GetMapping("/telegram-link/{code}")
    LinkStatus linkStatus(@PathVariable String code) {
        return new LinkStatus(devices.linked(code, player.id()));
    }
}
