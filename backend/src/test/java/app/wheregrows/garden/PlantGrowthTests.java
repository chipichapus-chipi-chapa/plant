package app.wheregrows.garden;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Чистая логика стадий, без Spring и базы. */
class PlantGrowthTests {

    static final Instant PLANTED = Instant.parse("2026-10-15T10:00:00Z");
    static final int[] RADISH = {10, 30};

    @Test
    void startsAsSprout() {
        PlantGrowth growth = PlantGrowth.at(PLANTED, RADISH, PLANTED);
        assertThat(growth.stage()).isZero();
        assertThat(growth.stageCount()).isEqualTo(3);
        assertThat(growth.nextStageAt()).isEqualTo(PLANTED.plusSeconds(10 * 60));
        assertThat(growth.mature()).isFalse();
    }

    @Test
    void stageChangesExactlyAtBoundary() {
        assertThat(PlantGrowth.at(PLANTED, RADISH, PLANTED.plusSeconds(10 * 60 - 1)).stage()).isZero();
        assertThat(PlantGrowth.at(PLANTED, RADISH, PLANTED.plusSeconds(10 * 60)).stage()).isEqualTo(1);
        assertThat(PlantGrowth.at(PLANTED, RADISH, PLANTED.plusSeconds(10 * 60)).nextStageAt())
                .isEqualTo(PLANTED.plusSeconds(40 * 60));
    }

    @Test
    void becomesMatureAndStaysSoForever() {
        PlantGrowth grown = PlantGrowth.at(PLANTED, RADISH, PLANTED.plusSeconds(40 * 60));
        assertThat(grown.stage()).isEqualTo(2);
        assertThat(grown.mature()).isTrue();
        assertThat(grown.nextStageAt()).isNull();

        PlantGrowth yearsLater = PlantGrowth.at(PLANTED, RADISH, PLANTED.plusSeconds(3L * 365 * 24 * 3600));
        assertThat(yearsLater.stage()).isEqualTo(2); // не вянет и не пропадает
    }
}
