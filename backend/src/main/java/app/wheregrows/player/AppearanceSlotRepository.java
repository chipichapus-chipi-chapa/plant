package app.wheregrows.player;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AppearanceSlotRepository extends JpaRepository<AppearanceSlot, String> {

    List<AppearanceSlot> findAllByOrderBySortOrderAsc();
}
