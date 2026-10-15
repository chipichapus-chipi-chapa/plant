package app.wheregrows.player;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerAppearanceRepository extends JpaRepository<PlayerAppearance, PlayerAppearance.Id> {

    List<PlayerAppearance> findByIdPlayerId(long playerId);
}
