package app.wheregrows.garden;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GardenObjectRepository extends JpaRepository<GardenObject, Long> {

    List<GardenObject> findByPlayerIdAndGardenKeyOrderByYAscXAsc(long playerId, String gardenKey);

    List<GardenObject> findByPlayerIdOrderByGardenKeyAscYAscXAsc(long playerId);

    boolean existsByPlayerIdAndGardenKeyAndXAndY(long playerId, String gardenKey, short x, short y);
}
