package app.wheregrows.garden;

import java.time.Duration;
import java.time.Instant;

/**
 * Стадия роста, вычисленная из времени посадки. Хранить стадию не нужно и нельзя «пропустить» день:
 * время просто идёт, растение никогда не вянет и не откатывается назад.
 *
 * <p>stageMinutes = [10, 30] значит: стадия 0 длится 10 минут, стадия 1 — ещё 30, дальше стадия 2 навсегда.
 *
 * @param stage       текущая стадия, от 0 до stageCount - 1
 * @param stageCount  сколько всего стадий (последняя — взрослое растение)
 * @param nextStageAt когда наступит следующая стадия; null, если растение уже взрослое
 */
public record PlantGrowth(int stage, int stageCount, Instant nextStageAt) {

    public boolean mature() {
        return stage == stageCount - 1;
    }

    public static PlantGrowth at(Instant plantedAt, int[] stageMinutes, Instant now) {
        Instant boundary = plantedAt;
        for (int stage = 0; stage < stageMinutes.length; stage++) {
            boundary = boundary.plus(Duration.ofMinutes(stageMinutes[stage]));
            if (now.isBefore(boundary)) {
                return new PlantGrowth(stage, stageMinutes.length + 1, boundary);
            }
        }
        return new PlantGrowth(stageMinutes.length, stageMinutes.length + 1, null);
    }
}
