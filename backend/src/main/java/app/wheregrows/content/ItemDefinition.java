package app.wheregrows.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Описание предмета: семена, декор. Количество у игрока хранится отдельно, в inventory_item. */
@Entity
@Table(name = "item_def")
public class ItemDefinition {

    @Id
    private String key;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemKind kind;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    /** Цена в росинках; null — предмет не продаётся. */
    private Integer price;

    @Column(name = "species_key")
    private String speciesKey;

    protected ItemDefinition() {
    }

    public String getKey() {
        return key;
    }

    public ItemKind getKind() {
        return kind;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Integer getPrice() {
        return price;
    }

    public String getSpeciesKey() {
        return speciesKey;
    }
}
