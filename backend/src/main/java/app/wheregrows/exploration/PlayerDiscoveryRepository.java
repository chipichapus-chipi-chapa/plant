package app.wheregrows.exploration;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerDiscoveryRepository extends JpaRepository<PlayerDiscovery, PlayerDiscovery.Id> {

    List<PlayerDiscovery> findByIdPlayerId(long playerId);
}
