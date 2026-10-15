package app.wheregrows.mentor;

import java.util.List;

/**
 * Что наставник скажет сейчас и как идёт обучение.
 *
 * @param nextDialogue разговор, который начнётся по клику на наставника; null — только случайные фразы
 * @param hasNews      есть новость (знакомство или выполненный шаг) — над наставником загорается «!»
 */
public record MentorProgress(String nextDialogue, boolean hasNews, List<StepState> steps) {

    public record StepState(String key, boolean done, boolean acknowledged) {
    }
}
