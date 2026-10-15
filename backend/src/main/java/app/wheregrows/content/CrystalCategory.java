package app.wheregrows.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Одна из шести категорий кристаллов. Контент: меняется в R__content.sql. */
@Entity
@Table(name = "crystal_category")
public class CrystalCategory {

    @Id
    private String key;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private String meaning;

    @Column(name = "sort_order", nullable = false)
    private short sortOrder;

    protected CrystalCategory() {
    }

    public String getKey() {
        return key;
    }

    public String getName() {
        return name;
    }

    public String getColor() {
        return color;
    }

    public String getMeaning() {
        return meaning;
    }

    public short getSortOrder() {
        return sortOrder;
    }
}
