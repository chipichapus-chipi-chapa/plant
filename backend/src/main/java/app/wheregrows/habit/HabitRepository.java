package app.wheregrows.habit;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitRepository extends JpaRepository<Habit, Long> {

    List<Habit> findByPlayerIdAndArchivedAtIsNullOrderByIdAsc(long playerId);

    Optional<Habit> findByIdAndPlayerIdAndArchivedAtIsNull(long id, long playerId);

    long countByPlayerIdAndArchivedAtIsNull(long playerId);

    boolean existsByPlayerIdAndTitleIgnoreCaseAndArchivedAtIsNull(long playerId, String title);

    boolean existsByPlayerIdAndTitleIgnoreCaseAndArchivedAtIsNullAndIdNot(long playerId, String title, long id);
}
