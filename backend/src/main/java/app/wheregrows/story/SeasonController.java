package app.wheregrows.story;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class SeasonController {

    private final SeasonService seasons;
    private final CurrentPlayer player;

    SeasonController(SeasonService seasons, CurrentPlayer player) {
        this.seasons = seasons;
        this.player = player;
    }

    /** Построить теплицу у дома на эту холодную пору. 201 — построена; 409 — тепло, уже стоит или не хватает. */
    @PostMapping("/api/garden/greenhouse")
    @ResponseStatus(HttpStatus.CREATED)
    SeasonService.SeasonState build() {
        return seasons.buildGreenhouse(player.id());
    }
}
