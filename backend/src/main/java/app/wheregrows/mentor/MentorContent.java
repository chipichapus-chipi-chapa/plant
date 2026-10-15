package app.wheregrows.mentor;

import java.util.List;
import java.util.Map;
import java.util.Set;

import app.wheregrows.economy.ItemGrant;

/**
 * Реплики и обучение наставника — контент (content/mentor/vereshk.json).
 * Новый разговор, ветка ответа или шаг обучения добавляются в JSON без изменения кода,
 * если шаг использует уже известное условие ({@link Condition}).
 */
public record MentorContent(Speaker speaker, String intro, List<String> idle, List<Step> tutorial,
                            Map<String, Dialogue> dialogues) {

    public record Speaker(String key, String name) {
    }

    /** Шаг обучения: засчитывается по условию из реальной игры, а не по нажатию «далее». */
    public record Step(String key, Condition condition, String hint, String done) {
    }

    /**
     * Разговор — граф реплик. onEnd — флаг, который ставится по завершении;
     * gift — подарок, выдаётся один раз вместе с первой установкой флага.
     */
    public record Dialogue(String start, String onEnd, List<ItemGrant> gift, Map<String, Node> nodes) {

        public List<ItemGrant> giftOrEmpty() {
            return gift == null ? List.of() : gift;
        }
    }

    /** Реплика: либо next (следующая реплика; null — конец), либо варианты ответа. */
    public record Node(String text, String next, List<Choice> choices) {
    }

    public record Choice(String text, String next) {
    }

    public Set<String> doneDialogues() {
        return Set.copyOf(tutorial.stream().map(Step::done).toList());
    }

    /** Ошибка в диалогах должна ронять запуск, а не обрывать разговор посреди игры. */
    void validate() {
        require(dialogues.containsKey(intro), "нет вступительного диалога " + intro);
        idle.forEach(key -> require(dialogues.containsKey(key), "нет диалога " + key));
        for (Step step : tutorial) {
            require(step.condition() != null, "у шага " + step.key() + " нет условия");
            require(dialogues.containsKey(step.hint()), "нет подсказки " + step.hint());
            Dialogue done = dialogues.get(step.done());
            require(done != null, "нет диалога " + step.done());
            require(("ack_" + step.key()).equals(done.onEnd()),
                    "диалог " + step.done() + " должен ставить флаг ack_" + step.key());
        }
        dialogues.forEach((key, dialogue) -> {
            require(dialogue.nodes().containsKey(dialogue.start()), key + ": нет стартовой реплики " + dialogue.start());
            dialogue.nodes().forEach((id, node) -> {
                require(node.next() == null || dialogue.nodes().containsKey(node.next()),
                        key + "." + id + ": переход на несуществующую реплику " + node.next());
                if (node.choices() != null) {
                    node.choices().forEach(choice -> require(dialogue.nodes().containsKey(choice.next()),
                            key + "." + id + ": ответ ведёт на несуществующую реплику " + choice.next()));
                }
            });
        });
    }

    private static void require(boolean condition, String problem) {
        if (!condition) {
            throw new IllegalStateException("Диалоги наставника: " + problem);
        }
    }
}
