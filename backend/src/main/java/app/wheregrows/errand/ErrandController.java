package app.wheregrows.errand;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class ErrandController {

    private final ErrandService service;
    private final CurrentPlayer currentPlayer;

    ErrandController(ErrandService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    /** Житель попросил — поручение взято (идемпотентно). */
    @PostMapping("/api/errands/{key}/accept")
    ErrandService.ErrandState accept(@PathVariable String key) {
        return service.accept(currentPlayer.id(), key);
    }

    /** Выполнить: отдать вещи или показать находку. 409 — не взято, уже сделано, не хватает или нечего показать. */
    @PostMapping("/api/errands/{key}/complete")
    ErrandService.ErrandResult complete(@PathVariable String key) {
        return service.complete(currentPlayer.id(), key);
    }
}
