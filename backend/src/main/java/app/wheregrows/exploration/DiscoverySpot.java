package app.wheregrows.exploration;

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
 * Место, где можно что-то найти. Привязано к постройке карты; содержимое — контент.
 * Может требовать пробуждённый объект мира: так важные находки зависят от продвижения, а не от удачи.
 */
@Entity
@Table(name = "discovery_spot")
public class DiscoverySpot {

    @Id
    private String key;

    @Column(name = "prop_key", nullable = false)
    private String propKey;

    @Column(name = "found_text", nullable = false)
    private String foundText;

    @Column(name = "empty_text", nullable = false)
    private String emptyText;

    @Column(name = "requires_awakened")
    private String requiresAwakened;

    @Column(name = "locked_text")
    private String lockedText;

    @Column(name = "artifact_key")
    private String artifactKey;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "discovery_spot_reward", joinColumns = @JoinColumn(name = "spot_key"))
    private List<Reward> rewards = new ArrayList<>();

    @Embeddable
    public record Reward(@Column(name = "item_key") String itemKey, @Column(name = "quantity") int quantity) {
    }

    protected DiscoverySpot() {
    }

    public String getKey() {
        return key;
    }

    public String getPropKey() {
        return propKey;
    }

    public String getFoundText() {
        return foundText;
    }

    public String getEmptyText() {
        return emptyText;
    }

    public String getRequiresAwakened() {
        return requiresAwakened;
    }

    public String getLockedText() {
        return lockedText;
    }

    public String getArtifactKey() {
        return artifactKey;
    }

    public List<Reward> getRewards() {
        return List.copyOf(rewards);
    }
}
