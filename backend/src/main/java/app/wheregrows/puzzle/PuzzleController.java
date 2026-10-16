package app.wheregrows.puzzle;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class PuzzleController {

    private final PuzzleService service;
    private final CurrentPlayer currentPlayer;

    PuzzleController(PuzzleService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    record AttemptRequest(@NotEmpty(message = "Поверните колёсики.") List<String> answer) {
    }

    /**
     * Попробовать открыть замок. Всегда 200: и «открыто», и «не подошло» — часть игры, а не ошибка.
     * 400 — только если комбинация не по форме замка (не то число колёсиков или чужие символы).
     */
    @PostMapping("/api/puzzles/{key}/attempts")
    AttemptResult attempt(@PathVariable String key, @Valid @RequestBody AttemptRequest request) {
        return service.attempt(currentPlayer.id(), key, request.answer());
    }
}
