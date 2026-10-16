package app.wheregrows.puzzle;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
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
 * Загадка-замок: несколько колёсиков, на каждом — одни и те же символы. Привязана к постройке карты.
 * Правильная комбинация хранится только здесь и никогда не уходит клиенту.
 */
@Entity
@Table(name = "puzzle_def")
public class Puzzle {

    @Id
    private String key;

    @Column(name = "prop_key", nullable = false)
    private String propKey;

    @Column(nullable = false)
    private String prompt;

    @Column(nullable = false)
    private String answer;

    @Column(name = "solved_text", nullable = false)
    private String solvedText;

    @Column(name = "wrong_text", nullable = false)
    private String wrongText;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "puzzle_symbol", joinColumns = @JoinColumn(name = "puzzle_key"))
    private List<Symbol> symbols = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "puzzle_reward", joinColumns = @JoinColumn(name = "puzzle_key"))
    private List<Reward> rewards = new ArrayList<>();

    @Embeddable
    public record Symbol(@Column(name = "symbol_key") String key, @Column(name = "name") String name,
                         @Column(name = "sort_order") short sortOrder) {
    }

    @Embeddable
    public record Reward(@Column(name = "item_key") String itemKey, @Column(name = "quantity") int quantity) {
    }

    protected Puzzle() {
    }

    public String getKey() {
        return key;
    }

    public String getPropKey() {
        return propKey;
    }

    public String getPrompt() {
        return prompt;
    }

    public String getSolvedText() {
        return solvedText;
    }

    public String getWrongText() {
        return wrongText;
    }

    /** Правильная комбинация по колёсикам. */
    public List<String> getAnswer() {
        return Arrays.asList(answer.split(","));
    }

    /** Сколько колёсиков на замке. */
    public int getDials() {
        return getAnswer().size();
    }

    public List<Symbol> getSymbols() {
        return symbols.stream().sorted(Comparator.comparingInt(Symbol::sortOrder)).toList();
    }

    public List<Reward> getRewards() {
        return List.copyOf(rewards);
    }
}
