package app.wheregrows.exploration;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerArtifactRepository extends JpaRepository<PlayerArtifact, PlayerArtifact.Id> {

    List<PlayerArtifact> findByIdPlayerIdOrderByFoundAt(long playerId);
}
