package app.wheregrows.player;

import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ProfileController {

    private final ProfileService service;
    private final CurrentPlayer currentPlayer;

    ProfileController(ProfileService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    record ProfileRequest(
            @NotBlank(message = "Как вас зовут?")
            @Size(max = 40, message = "Имя — не длиннее 40 символов.")
            String displayName,
            @NotNull(message = "Выберите облик.")
            Map<String, String> appearance) {
    }

    /** Сохранить имя и облик персонажа. Новое состояние клиент берёт из /api/state. */
    @PutMapping("/api/profile")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void update(@Valid @RequestBody ProfileRequest request) {
        service.update(currentPlayer.id(), request.displayName(), request.appearance());
    }
}
