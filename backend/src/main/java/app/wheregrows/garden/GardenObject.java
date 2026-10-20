package app.wheregrows.garden;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Растение (а позже и декор), которое игрок разместил в клетке сада. */
@Entity
@Table(name = "garden_object")
public class GardenObject {

    static final String PLANT = "PLANT";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false, updatable = false)
    private long playerId;

    @Column(name = "garden_key", nullable = false, updatable = false)
    private String gardenKey;

    @Column(nullable = false, updatable = false)
    private short x;

    @Column(nullable = false, updatable = false)
    private short y;

    @Column(nullable = false, updatable = false)
    private String kind;

    @Column(name = "species_key", updatable = false)
    private String speciesKey;

    @Column(name = "planted_at", nullable = false, updatable = false)
    private Instant plantedAt;

    protected GardenObject() {
    }

    static GardenObject plant(long playerId, String gardenKey, int x, int y, String speciesKey, Instant at) {
        GardenObject object = new GardenObject();
        object.playerId = playerId;
        object.gardenKey = gardenKey;
        object.x = (short) x;
        object.y = (short) y;
        object.kind = PLANT;
        object.speciesKey = speciesKey;
        object.plantedAt = at;
        return object;
    }

    public String getGardenKey() {
        return gardenKey;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public String getKind() {
        return kind;
    }

    public String getSpeciesKey() {
        return speciesKey;
    }

    public Instant getPlantedAt() {
        return plantedAt;
    }
}
