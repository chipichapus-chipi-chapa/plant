package app.wheregrows.magic;

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
import jakarta.persistence.Table;

/**
 * Магический рецепт: какие ресурсы нужны, чтобы пробудить объект мира.
 * Контент — меняется в R__content.sql, игровая логика от конкретных рецептов не зависит.
 */
@Entity
@Table(name = "recipe_def")
public class Recipe {

    @Id
    private String key;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    @Column(name = "target_object_key", nullable = false)
    private String targetObjectKey;

    @Column(name = "result_text", nullable = false)
    private String resultText;

    @Column(name = "sort_order", nullable = false)
    private short sortOrder;

    /** Надпись на кнопке: «Пробудить», «Починить»… */
    @Column(name = "action_label", nullable = false)
    private String actionLabel;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "recipe_ingredient", joinColumns = @JoinColumn(name = "recipe_key"))
    private List<Ingredient> ingredients = new ArrayList<>();

    @Embeddable
    public record Ingredient(
            @Column(name = "item_key") String itemKey,
            @Column(name = "quantity") int quantity) {
    }

    protected Recipe() {
    }

    public String getActionLabel() {
        return actionLabel;
    }

    public String getKey() {
        return key;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getTargetObjectKey() {
        return targetObjectKey;
    }

    public String getResultText() {
        return resultText;
    }

    public List<Ingredient> getIngredients() {
        return List.copyOf(ingredients);
    }
}
