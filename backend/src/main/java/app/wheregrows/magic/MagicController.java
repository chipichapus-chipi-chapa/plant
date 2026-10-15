package app.wheregrows.magic;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class MagicController {

    private final MagicService service;
    private final CurrentPlayer currentPlayer;

    MagicController(MagicService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    /**
     * Применить рецепт: списать ингредиенты и пробудить объект. 201 — пробуждён;
     * 409 — не хватает ресурсов или объект уже пробуждён (в обоих случаях ничего не потрачено).
     */
    @PostMapping("/api/magic/recipes/{key}/cast")
    @ResponseStatus(HttpStatus.CREATED)
    CastResult cast(@PathVariable String key) {
        return service.cast(currentPlayer.id(), key);
    }
}
