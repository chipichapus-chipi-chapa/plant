package app.wheregrows.gift;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class GiftController {

    private final GiftService service;
    private final CurrentPlayer currentPlayer;

    GiftController(GiftService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    record GiftRequest(@NotBlank(message = "Выберите, что подарить.") String itemKey) {
    }

    /** Подарить жителю урожай из сумки. 201 — подарено; 409 — сегодня этому жителю уже дарили или нечего дарить. */
    @PostMapping("/api/npcs/{key}/gifts")
    @ResponseStatus(HttpStatus.CREATED)
    GiftService.GiftResult give(@PathVariable String key, @Valid @RequestBody GiftRequest request) {
        return service.give(currentPlayer.id(), key, request.itemKey());
    }
}
