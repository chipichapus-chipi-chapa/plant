package app.wheregrows.player;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ValleyController {

    private final ValleyCalendar valley;
    private final CurrentPlayer player;

    ValleyController(ValleyCalendar valley, CurrentPlayer player) {
        this.valley = valley;
        this.player = player;
    }

    /** days — на сколько дней покрутить часы долины (минус — назад); 0 — вернуть настоящее время. */
    record WindRequest(int days) {
    }

    record WindResult(int offset) {
    }

    @PostMapping("/api/valley/clock")
    WindResult wind(@RequestBody WindRequest request) {
        return new WindResult(valley.wind(player.id(), request.days()));
    }
}
