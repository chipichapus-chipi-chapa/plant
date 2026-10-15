package app.wheregrows.player;

import java.time.Clock;
import java.time.LocalDate;

import org.springframework.stereotype.Component;

/** Какой сейчас день у игрока. Дату всегда считает сервер, клиент её не присылает. */
@Component
public class GameCalendar {

    private final Clock clock;

    GameCalendar(Clock clock) {
        this.clock = clock;
    }

    public LocalDate today(PlayerProfile player) {
        return LocalDate.now(clock.withZone(player.getZone()));
    }
}
