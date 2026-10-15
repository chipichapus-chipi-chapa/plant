package app.wheregrows.magic;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WorldObjectStateRepository extends JpaRepository<WorldObjectState, WorldObjectState.Id> {

    List<WorldObjectState> findByIdPlayerIdOrderByIdObjectKey(long playerId);
}
