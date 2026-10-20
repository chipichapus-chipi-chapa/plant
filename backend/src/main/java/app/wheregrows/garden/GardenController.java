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

    /** gardenKey — локация грядки; не указана — домашний сад. */
    record PlantingRequest(
            String gardenKey,
            @Min(value = 0, message = "Такой клетки в саду нет.") int x,
            @Min(value = 0, message = "Такой клетки в саду нет.") int y,
            @NotBlank(message = "Выберите, что посадить.") String seedItemKey) {
    }

    record WeedingRequest(
            @Min(value = 0, message = "Такой клетки в саду нет.") int x,
            @Min(value = 0, message = "Такой клетки в саду нет.") int y) {
    }

    record HarvestRequest(
            String gardenKey,
            @Min(value = 0, message = "Такой клетки в саду нет.") int x,
            @Min(value = 0, message = "Такой клетки в саду нет.") int y) {
    }

    /** Собрать взрослое растение в клетке (x, y) локации gardenKey (без неё — домашний сад). 201 — собрано. */
    @PostMapping("/api/garden/harvests")
    @ResponseStatus(HttpStatus.CREATED)
    GardenService.HarvestResult harvest(@Valid @RequestBody HarvestRequest request) {
        return service.harvest(currentPlayer.id(),
                request.gardenKey() == null ? GardenMaps.HOME : request.gardenKey(), request.x(), request.y());
    }

    /** Поставить зимой теплицу над грядкой (x, y) локации gardenKey (без неё — домашний сад). 201 — поставлена. */
    @PostMapping("/api/garden/greenhouses")
    @ResponseStatus(HttpStatus.CREATED)
    app.wheregrows.story.SeasonService.SeasonState greenhouse(@Valid @RequestBody HarvestRequest request) {
        return service.buildGreenhouse(currentPlayer.id(),
                request.gardenKey() == null ? GardenMaps.HOME : request.gardenKey(), request.x(), request.y());
    }

    /** Прополоть заросшую грядку (x, y). 201 — прополота; в ответе — сколько заросших клеток осталось. */
    @PostMapping("/api/garden/weedings")
    @ResponseStatus(HttpStatus.CREATED)
    WeedResult weed(@Valid @RequestBody WeedingRequest request) {
        return service.weed(currentPlayer.id(), request.x(), request.y());
    }

    /** Посадить семя из сумки на грядку (x, y). 201 — посажено; ответ содержит растение со стадией роста. */
    @PostMapping("/api/garden/plantings")
    @ResponseStatus(HttpStatus.CREATED)
    GardenObjectView plant(@Valid @RequestBody PlantingRequest request) {
        return service.plant(currentPlayer.id(),
                request.gardenKey() == null ? GardenMaps.HOME : request.gardenKey(), request.x(), request.y(), request.seedItemKey());
    }
}
