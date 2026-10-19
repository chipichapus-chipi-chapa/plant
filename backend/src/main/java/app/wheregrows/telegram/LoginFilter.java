package app.wheregrows.telegram;

import java.io.IOException;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Conditional;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import app.wheregrows.player.LocalPlayerProvisioner;
import tools.jackson.databind.json.JsonMapper;

/**
 * Вход для каждого запроса к /api — двумя способами:
 * <ul>
 *   <li>из Telegram Mini App — подписанная initData в заголовке {@value #INIT_DATA_HEADER};
 *       подпись верна — запрос выполняется от имени этого игрока (при первом входе создаётся профиль);</li>
 *   <li>из приложения (PWA) — ключ устройства в заголовке {@value #DEVICE_HEADER}, см. {@link DeviceAccounts}.</li>
 * </ul>
 * Иначе 401. Открыт только {@value #REGISTER_PATH}: через него приложение и получает ключ.
 */
@Component
@Conditional(TelegramMode.On.class)
class LoginFilter extends OncePerRequestFilter {

    static final String INIT_DATA_HEADER = "X-Telegram-Init-Data";
    static final String DEVICE_HEADER = "X-Device-Token";
    static final String TIMEZONE_HEADER = "X-Timezone";
    static final String REGISTER_PATH = "/api/auth/device";
    static final String PLAYER_ATTRIBUTE = LoginFilter.class.getName() + ".player";

    private static final int MAX_NAME = 40;

    private final TelegramInitData initData;
    private final DeviceAccounts devices;
    private final LocalPlayerProvisioner provisioner;
    private final JsonMapper json;
    /** telegram id → id игрока: профиль создаётся один раз, дальше база не нужна */
    private final Map<Long, Long> players = new ConcurrentHashMap<>();

    LoginFilter(@Value("${" + TelegramMode.TOKEN_PROPERTY + "}") String botToken,
                       @Value("${telegram.max-age:P1D}") Duration maxAge,
                       Clock clock,
                       JsonMapper json,
                       DeviceAccounts devices,
                       LocalPlayerProvisioner provisioner) {
        this.initData = new TelegramInitData(botToken.trim(), maxAge, clock, json);
        this.devices = devices;
        this.provisioner = provisioner;
        this.json = json;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Предварительный CORS-запрос браузера идёт без заголовков — его пропускаем
        return !request.getRequestURI().startsWith("/api/")
                || "OPTIONS".equals(request.getMethod())
                || REGISTER_PATH.equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Optional<Long> player = telegramPlayer(request).or(() -> devicePlayer(request));
        if (player.isEmpty()) {
            reject(response);
            return;
        }
        request.setAttribute(PLAYER_ATTRIBUTE, player.get());
        chain.doFilter(request, response);
    }

    private Optional<Long> telegramPlayer(HttpServletRequest request) {
        return initData.verify(request.getHeader(INIT_DATA_HEADER)).map(u -> {
            Long playerId = players.get(u.id());
            if (playerId == null) {
                // создание профиля идемпотентно, так что два первых запроса подряд не помешают друг другу
                playerId = provisioner.provision("tg:" + u.id(), displayName(u), timezone(request));
                players.put(u.id(), playerId);
            }
            return playerId;
        });
    }

    private Optional<Long> devicePlayer(HttpServletRequest request) {
        String token = request.getHeader(DEVICE_HEADER);
        return token == null || token.isBlank() ? Optional.empty() : devices.playerFor(token.trim());
    }

    private void reject(HttpServletResponse response) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED,
                "Откройте игру через кнопку «Играть» у бота в Telegram или установите приложение.");
        problem.setTitle("Нужен вход");
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getWriter(), problem);
    }

    private static String displayName(TelegramInitData.User user) {
        String name = user.firstName().trim();
        if (name.isEmpty()) {
            return "Садовник";
        }
        return name.length() > MAX_NAME ? name.substring(0, MAX_NAME) : name;
    }

    /** Часовой пояс из браузера: по нему сервер решает, какой у игрока «сегодня». */
    static ZoneId timezone(HttpServletRequest request) {
        String zone = request.getHeader(TIMEZONE_HEADER);
        if (zone != null) {
            try {
                return ZoneId.of(zone);
            } catch (DateTimeException e) {
                // неизвестный пояс — берём UTC
            }
        }
        return ZoneOffset.UTC;
    }
}
