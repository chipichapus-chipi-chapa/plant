package app.wheregrows.garden;

import java.time.Instant;

/** Объект в саду так, как его видит клиент: на какой локации и где. Стадию роста посчитал сервер. */
public record GardenObjectView(String gardenKey, int x, int y, String kind, String speciesKey, Instant plantedAt, int stage,
                               int stageCount, boolean mature, Instant nextStageAt) {
}
