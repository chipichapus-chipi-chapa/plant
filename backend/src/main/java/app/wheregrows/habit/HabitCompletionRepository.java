package app.wheregrows.habit;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HabitCompletionRepository extends JpaRepository<HabitCompletion, Long> {

    Optional<HabitCompletion> findByHabitIdAndCompletedOn(long habitId, LocalDate completedOn);

    List<HabitCompletion> findByPlayerIdAndCompletedOn(long playerId, LocalDate completedOn);

    /** Сколько отметок за день уже принесли награду — для дневного лимита. */
    @Query("""
            select count(c) from HabitCompletion c
            where c.playerId = :playerId and c.completedOn = :day
              and (c.lifeSeeds > 0 or c.shardItemKey is not null)""")
    long countRewarded(@Param("playerId") long playerId, @Param("day") LocalDate day);
}
