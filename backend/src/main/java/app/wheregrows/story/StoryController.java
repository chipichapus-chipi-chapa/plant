package app.wheregrows.story;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

/** Сюжетные события второй главы: субботний хлеб. Новое состояние клиент берёт из /api/state. */
@RestController
@RequestMapping("/api/story")
class StoryController {

    private final BreadService bread;
    private final CurrentPlayer player;

    StoryController(BreadService bread, CurrentPlayer player) {
        this.bread = bread;
        this.player = player;
    }

    @PostMapping("/bread")
    BreadService.BreadResult bake() {
        return bread.bake(player.id());
    }
}
