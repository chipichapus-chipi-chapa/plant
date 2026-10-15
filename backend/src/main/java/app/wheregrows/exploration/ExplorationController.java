package app.wheregrows.exploration;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class ExplorationController {

    private final ExplorationService service;
    private final CurrentPlayer currentPlayer;

    ExplorationController(ExplorationService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    /**
     * Осмотреть место находки. Всегда 200: результат (нашли / уже пусто / пока не найти)
     * — часть игры, а не ошибка. Повторный поиск ничего не начисляет.
     */
    @PostMapping("/api/exploration/spots/{key}/search")
    SearchResult search(@PathVariable String key) {
        return service.search(currentPlayer.id(), key);
    }
}
