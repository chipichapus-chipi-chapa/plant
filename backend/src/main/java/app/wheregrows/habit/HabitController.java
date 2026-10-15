package app.wheregrows.habit;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class HabitController {

    private final HabitService service;
    private final CurrentPlayer currentPlayer;

    HabitController(HabitService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    /** Тело запроса на создание и изменение. crystalCategory может быть null — без кристалла. */
    record HabitRequest(
            @NotBlank(message = "Назовите привычку.")
            @Size(max = 60, message = "Название — не длиннее 60 символов.")
            String title,
            String crystalCategory) {
    }

    @PostMapping("/api/habits")
    @ResponseStatus(HttpStatus.CREATED)
    HabitView create(@Valid @RequestBody HabitRequest request) {
        return service.create(currentPlayer.id(), request.title(), request.crystalCategory());
    }

    /** Полная замена настроек привычки: название и категория. */
    @PutMapping("/api/habits/{id}")
    HabitView update(@PathVariable long id, @Valid @RequestBody HabitRequest request) {
        return service.update(currentPlayer.id(), id, request.title(), request.crystalCategory());
    }

    @DeleteMapping("/api/habits/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void archive(@PathVariable long id) {
        service.archive(currentPlayer.id(), id);
    }

    /**
     * Идемпотентная отметка «сделано сегодня»: 201 — отметка создана сейчас,
     * 200 — она уже была, повторной награды нет. День определяет сервер.
     */
    @PutMapping("/api/habits/{id}/completions/today")
    ResponseEntity<CompletionResult> completeToday(@PathVariable long id) {
        CompletionResult result = service.completeToday(currentPlayer.id(), id);
        return ResponseEntity.status(result.newlyCompleted() ? HttpStatus.CREATED : HttpStatus.OK).body(result);
    }
}
