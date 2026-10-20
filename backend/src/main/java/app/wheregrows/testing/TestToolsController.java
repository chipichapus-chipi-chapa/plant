package app.wheregrows.testing;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

/** Кнопки тестирования (см. {@link Testers}). Новое состояние клиент берёт из /api/state. */
@RestController
@RequestMapping("/api/test")
class TestToolsController {

    private final TestToolsService tools;
    private final CurrentPlayer player;

    TestToolsController(TestToolsService tools, CurrentPlayer player) {
        this.tools = tools;
        this.player = player;
    }

    @PostMapping("/resources")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resources() {
        tools.resources(player.id());
    }

    @PostMapping("/open-paths")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void openPaths() {
        tools.openPaths(player.id());
    }

    @PostMapping("/fog-day")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void fogDay() {
        tools.fogDay(player.id());
    }

    @PostMapping("/fog-clear")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void fogClear() {
        tools.fogClear(player.id());
    }

    @PostMapping("/bread-day")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void breadDay() {
        tools.breadDay(player.id());
    }

    @PostMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void reset() {
        tools.reset(player.id());
    }
}
