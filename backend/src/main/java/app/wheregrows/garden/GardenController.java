package app.wheregrows.garden;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class GardenController {

    private final GardenService service;
    private final CurrentPlayer currentPlayer;

    GardenController(GardenService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    record PlantingRequest(
            @Min(value = 0, message = "Такой клетки в саду нет.") int x,
            @Min(value = 0, message = "Такой клетки в саду нет.") int y,
            @NotBlank(message = "Выберите, что посадить.") String seedItemKey) {
    }

    /** Посадить семя из сумки на грядку (x, y). 201 — посажено; ответ содержит растение со стадией роста. */
    @PostMapping("/api/garden/plantings")
    @ResponseStatus(HttpStatus.CREATED)
    GardenObjectView plant(@Valid @RequestBody PlantingRequest request) {
        return service.plant(currentPlayer.id(), request.x(), request.y(), request.seedItemKey());
    }
}
