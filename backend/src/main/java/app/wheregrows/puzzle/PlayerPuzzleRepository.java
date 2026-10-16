package app.wheregrows.puzzle;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerPuzzleRepository extends JpaRepository<PlayerPuzzle, PlayerPuzzle.Id> {

    List<PlayerPuzzle> findByIdPlayerId(long playerId);
}
