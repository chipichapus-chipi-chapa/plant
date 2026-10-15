package app.wheregrows.state;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class GameStateController {

    private final GameStateService service;
    private final CurrentPlayer currentPlayer;

    GameStateController(GameStateService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    /** Всё, что нужно клиенту при загрузке игры, одним запросом. */
    @GetMapping("/api/state")
    GameStateResponse state() {
        return service.load(currentPlayer.id());
    }
}
