package app.wheregrows.telegram;

import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import app.wheregrows.player.CurrentPlayer;

/** Игрок текущего запроса — тот, чью подпись Telegram проверил {@link LoginFilter}. */
@Component
@Conditional(TelegramMode.On.class)
class TelegramCurrentPlayer implements CurrentPlayer {

    @Override
    public long id() {
        Object id = RequestContextHolder.currentRequestAttributes()
                .getAttribute(LoginFilter.PLAYER_ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
        if (id == null) {
            throw new IllegalStateException("Запрос не прошёл вход через Telegram");
        }
        return (Long) id;
    }
}
