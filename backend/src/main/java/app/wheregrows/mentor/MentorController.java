package app.wheregrows.mentor;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class MentorController {

    private final MentorService service;
    private final CurrentPlayer currentPlayer;

    MentorController(MentorService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    /**
     * Разговор дочитан до конца: ставится флаг (например, «шаг обучения отмечен»)
     * и, если положено, выдаётся подарок — один раз. 409 — этот разговор сейчас не к месту.
     */
    @PostMapping("/api/mentor/dialogues/{key}/finish")
    FinishResult finish(@PathVariable String key) {
        return service.finish(currentPlayer.id(), key);
    }
}
