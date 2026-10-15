package app.wheregrows.player;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsername(String username);

    /** Атомарно создаёт пользователя, если его ещё нет; параллельные вызовы не создадут дубль. */
    @Modifying
    @Query(value = "INSERT INTO app_user (username) VALUES (:username) ON CONFLICT (username) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("username") String username);
}
