package app.wheregrows.mentor;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerFlagRepository extends JpaRepository<PlayerFlag, PlayerFlag.Id> {

    List<PlayerFlag> findByIdPlayerId(long playerId);
}
