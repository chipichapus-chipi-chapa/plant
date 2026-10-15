package app.wheregrows.player;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlayerProfileRepository extends JpaRepository<PlayerProfile, Long> {

    @Modifying
    @Query(value = """
            INSERT INTO player_profile (user_id, display_name, timezone)
            VALUES (:userId, :displayName, :timezone)
            ON CONFLICT (user_id) DO NOTHING""", nativeQuery = true)
    int insertIfAbsent(@Param("userId") long userId,
                       @Param("displayName") String displayName,
                       @Param("timezone") String timezone);
}
