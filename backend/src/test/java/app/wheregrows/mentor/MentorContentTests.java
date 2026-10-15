package app.wheregrows.mentor;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Проверка диалогового графа без Spring: битые переходы должны ронять запуск. */
class MentorContentTests {

    private static MentorContent.Dialogue dialogue(Map<String, MentorContent.Node> nodes) {
        return new MentorContent.Dialogue("a", null, null, nodes);
    }

    private static MentorContent content(Map<String, MentorContent.Dialogue> dialogues, List<MentorContent.Step> steps) {
        return new MentorContent(new MentorContent.Speaker("v", "В"), "intro", List.of(), steps, dialogues);
    }

    @Test
    void brokenTransitionIsRejected() {
        var intro = dialogue(Map.of("a", new MentorContent.Node("Привет", "nowhere", null)));
        assertThatThrownBy(() -> content(Map.of("intro", intro), List.of()).validate())
                .hasMessageContaining("nowhere");
    }

    @Test
    void choiceToMissingNodeIsRejected() {
        var intro = dialogue(Map.of("a", new MentorContent.Node("?", null,
                List.of(new MentorContent.Choice("Да", "b")))));
        assertThatThrownBy(() -> content(Map.of("intro", intro), List.of()).validate())
                .hasMessageContaining("ответ ведёт");
    }

    @Test
    void stepCompletionMustSetAckFlag() {
        var line = Map.of("a", new MentorContent.Node("...", null, null));
        var dialogues = Map.of(
                "intro", dialogue(line),
                "hint", dialogue(line),
                "done", new MentorContent.Dialogue("a", "wrong_flag", null, line));
        var step = new MentorContent.Step("plant", Condition.PLANTED, "hint", "done");
        assertThatThrownBy(() -> content(dialogues, List.of(step)).validate())
                .hasMessageContaining("ack_plant");
    }
}
