package app.wheregrows.garden;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerTileRepository extends JpaRepository<PlayerTile, PlayerTile.Id> {

    List<PlayerTile> findByIdPlayerIdAndIdGardenKey(long playerId, String gardenKey);
}
