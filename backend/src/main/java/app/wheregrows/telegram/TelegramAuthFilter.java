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
 * Вход через Telegram: каждый запрос к /api несёт подписанную initData в заголовке
 * {@value #INIT_DATA_HEADER}. Подпись верна — запрос выполняется от имени этого игрока
 * (при первом входе создаётся профиль), иначе 401.
 */
@Component
@Conditional(TelegramMode.On.class)
class TelegramAuthFilter extends OncePerRequestFilter {

    static final String INIT_DATA_HEADER = "X-Telegram-Init-Data";
    static final String TIMEZONE_HEADER = "X-Timezone";
    static final String PLAYER_ATTRIBUTE = TelegramAuthFilter.class.getName() + ".player";

    private static final int MAX_NAME = 40;

    private final TelegramInitData initData;
    private final LocalPlayerProvisioner provisioner;
    private final JsonMapper json;
    /** telegram id → id игрока: профиль создаётся один раз, дальше база не нужна */
    private final Map<Long, Long> players = new ConcurrentHashMap<>();

    TelegramAuthFilter(@Value("${" + TelegramMode.TOKEN_PROPERTY + "}") String botToken,
                       @Value("${telegram.max-age:P1D}") Duration maxAge,
                       Clock clock,
                       JsonMapper json,
                       LocalPlayerProvisioner provisioner) {
        this.initData = new TelegramInitData(botToken.trim(), maxAge, clock, json);
        this.provisioner = provisioner;
        this.json = json;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Предварительный CORS-запрос браузера идёт без заголовков — его пропускаем
        return !request.getRequestURI().startsWith("/api/") || "OPTIONS".equals(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Optional<TelegramInitData.User> user = initData.verify(request.getHeader(INIT_DATA_HEADER));
        if (user.isEmpty()) {
            reject(response);
            return;
        }
        TelegramInitData.User u = user.get();
        Long playerId = players.get(u.id());
        if (playerId == null) {
            // создание профиля идемпотентно, так что два первых запроса подряд не помешают друг другу
            playerId = provisioner.provision("tg:" + u.id(), displayName(u), timezone(request));
            players.put(u.id(), playerId);
        }
        request.setAttribute(PLAYER_ATTRIBUTE, playerId);
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response) throws IOException {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED,
                "Игра открывается из Telegram — через кнопку «Играть» у бота.");
        problem.setTitle("Нужен вход через Telegram");
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
    private static ZoneId timezone(HttpServletRequest request) {
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
