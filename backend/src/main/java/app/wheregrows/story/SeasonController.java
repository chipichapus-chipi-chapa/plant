package app.wheregrows.story;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;
import app.wheregrows.player.ValleyCalendar;

@RestController
class SeasonController {

    private final SeasonService seasons;
    private final CurrentPlayer player;
    private final ValleyCalendar valley;

    SeasonController(SeasonService seasons, CurrentPlayer player, ValleyCalendar valley) {
        this.valley = valley;
        this.seasons = seasons;
        this.player = player;
    }

    /**
     * Часы долины: seasons — на сколько времён года перевести, days — на сколько дней (минус — назад);
     * reset — вернуть стрелки как было (и время года, и день).
     */
    record WindRequest(Integer seasons, Integer days, Boolean reset) {

        boolean resets() {
            return Boolean.TRUE.equals(reset);
        }
    }

    @PostMapping("/api/valley/clock")
    SeasonService.SeasonState wind(@org.springframework.web.bind.annotation.RequestBody WindRequest request) {
        int days = request.days() == null ? 0 : request.days();
        int turns = request.seasons() == null ? 0 : request.seasons();
        valley.wind(player.id(), days, request.resets());
        return seasons.wind(player.id(), turns, request.resets());
    }
}
