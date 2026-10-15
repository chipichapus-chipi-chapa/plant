package app.wheregrows.player;

import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlayerProfileRepository extends JpaRepository<PlayerProfile, Long> {

    /**
     * Профиль с блокировкой строки до конца транзакции (SELECT … FOR UPDATE).
     * Так операции одного игрока, меняющие ресурсы, выполняются строго по очереди.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PlayerProfile p where p.id = :id")
    Optional<PlayerProfile> lockById(@Param("id") long id);

    @Modifying
    @Query(value = """
            INSERT INTO player_profile (user_id, display_name, timezone)
            VALUES (:userId, :displayName, :timezone)
            ON CONFLICT (user_id) DO NOTHING""", nativeQuery = true)
    int insertIfAbsent(@Param("userId") long userId,
                       @Param("displayName") String displayName,
                       @Param("timezone") String timezone);
}
