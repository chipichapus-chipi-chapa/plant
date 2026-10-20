package app.wheregrows.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Вид растения из каталога. Контент только читается: его меняют миграцией R__content.sql. */
@Entity
@Table(name = "plant_species")
public class PlantSpecies {

    @Id
    private String key;

    @Column(nullable = false)
    private String name;

    /** Длительность каждой стадии роста в минутах; после последней растение взрослое. */
    @Column(name = "stage_minutes", nullable = false)
    private int[] stageMinutes;

    /** Что даёт растение, когда его собрали; null — собирать нечего. */
    @Column(name = "produce_key")
    private String produceKey;

    @Column(name = "produce_quantity", nullable = false)
    private int produceQuantity;

    protected PlantSpecies() {
    }

    public String getKey() {
        return key;
    }

    public String getName() {
        return name;
    }

    public String getProduceKey() {
        return produceKey;
    }

    public int getProduceQuantity() {
        return produceQuantity;
    }

    public int[] getStageMinutes() {
        return stageMinutes.clone();
    }
}
