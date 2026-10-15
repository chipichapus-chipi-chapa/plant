package app.wheregrows.player;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/** Слот внешности (причёска, цвет волос, …) и его варианты. Контент: R__content.sql. */
@Entity
@Table(name = "appearance_slot")
public class AppearanceSlot {

    @Id
    private String key;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String kind;

    @Column(name = "sort_order", nullable = false)
    private short sortOrder;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "appearance_option", joinColumns = @JoinColumn(name = "slot_key"))
    @OrderBy("sortOrder")
    private List<Option> options = new ArrayList<>();

    @Embeddable
    public record Option(
            @Column(name = "key") String key,
            @Column(name = "name") String name,
            @Column(name = "color") String color,
            @Column(name = "sort_order") short sortOrder) {
    }

    protected AppearanceSlot() {
    }

    public String getKey() {
        return key;
    }

    public String getName() {
        return name;
    }

    public String getKind() {
        return kind;
    }

    public List<Option> getOptions() {
        return List.copyOf(options);
    }

    /** Вариант по умолчанию — первый по порядку. */
    public String defaultOption() {
        return options.get(0).key();
    }

    public boolean hasOption(String optionKey) {
        return options.stream().anyMatch(o -> o.key().equals(optionKey));
    }
}
