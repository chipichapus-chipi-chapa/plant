package app.wheregrows.exploration;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Уникальный коллекционный кристалл. Контент: меняется в R__content.sql. */
@Entity
@Table(name = "artifact_def")
public class Artifact {

    @Id
    private String key;

    @Column(nullable = false)
    private String name;

    @Column(name = "crystal_category", nullable = false)
    private String crystalCategory;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String legend;

    @Column(name = "acquisition_hint", nullable = false)
    private String acquisitionHint;

    @Column(name = "effect_text", nullable = false)
    private String effectText;

    @Column(name = "sort_order", nullable = false)
    private short sortOrder;

    protected Artifact() {
    }

    public String getKey() {
        return key;
    }

    public String getName() {
        return name;
    }

    public String getCrystalCategory() {
        return crystalCategory;
    }

    public String getDescription() {
        return description;
    }

    public String getLegend() {
        return legend;
    }

    public String getAcquisitionHint() {
        return acquisitionHint;
    }

    public String getEffectText() {
        return effectText;
    }
}
