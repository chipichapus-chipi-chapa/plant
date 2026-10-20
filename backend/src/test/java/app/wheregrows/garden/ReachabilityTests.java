package app.wheregrows.garden;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import app.wheregrows.TestcontainersConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * От входа в каждую локацию можно дойти до каждого жителя и до каждого предмета, с которым что-то делают
 * (дверь, записка, тайник, рецепт). Иначе поручение не выполнить: так Хмур на Лунной поляне перекрыл собой
 * единственный проход, и к двум фонарям было не подойти.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class ReachabilityTests {

    /** Те же клетки, по которым клиент пускает ходить (frontend/src/game/movement.ts, WALKABLE). */
    static final Set<String> WALKABLE = Set.of("grass", "weeds", "path", "soil", "overgrown", "floor", "bridge", "rug", "dreamgrass", "stardust");

    @Autowired
    GardenMaps maps;

    @Autowired
    JdbcTemplate jdbc;

    record Cell(int x, int y) {
    }

    @Test
    void everythingYouCanUseCanBeReachedFromTheEntrance() {
        Set<String> used = new HashSet<>(jdbc.queryForList("SELECT target_object_key FROM recipe_def", String.class));
        used.addAll(jdbc.queryForList("SELECT prop_key FROM discovery_spot", String.class));
        List<String> problems = new ArrayList<>();

        for (GardenMap map : maps.all()) {
            Set<Cell> blocked = new HashSet<>();
            for (GardenMap.Prop p : map.props()) {
                for (int y = p.y(); y < p.y() + p.height(); y++) {
                    for (int x = p.x(); x < p.x() + p.width(); x++) {
                        blocked.add(new Cell(x, y));
                    }
                }
            }
            map.npcsOrEmpty().forEach(n -> blocked.add(new Cell(n.x(), n.y())));

            // входы: клетки, куда ведут двери других локаций (у домашнего сада — ещё и место появления)
            List<Cell> entrances = new ArrayList<>();
            for (GardenMap other : maps.all()) {
                for (GardenMap.Prop p : other.props()) {
                    if (p.door() != null && p.door().map().equals(map.key())) {
                        entrances.add(new Cell(p.door().x(), p.door().y()));
                    }
                }
            }
            if (entrances.isEmpty()) {
                continue;
            }
            Set<Cell> reach = new HashSet<>(entrances);
            ArrayDeque<Cell> queue = new ArrayDeque<>(entrances);
            while (!queue.isEmpty()) {
                Cell c = queue.poll();
                for (int[] d : new int[][] {{1, 0}, {-1, 0}, {0, 1}, {0, -1}}) {
                    Cell n = new Cell(c.x() + d[0], c.y() + d[1]);
                    if (map.contains(n.x(), n.y()) && WALKABLE.contains(map.tileAt(n.x(), n.y()).type())
                            && !blocked.contains(n) && reach.add(n)) {
                        queue.add(n);
                    }
                }
            }

            for (GardenMap.Prop p : map.props()) {
                boolean matters = p.door() != null || p.read() != null || used.contains(p.key());
                if (matters && !besideAny(p.x(), p.y(), p.width(), p.height(), reach)) {
                    problems.add(map.key() + ": к «" + p.name() + "» (" + p.key() + ") не подойти");
                }
            }
            for (GardenMap.Npc n : map.npcsOrEmpty()) {
                if (!besideAny(n.x(), n.y(), 1, 1, reach)) {
                    problems.add(map.key() + ": к жителю «" + n.name() + "» не подойти");
                }
            }
        }
        assertThat(problems).isEmpty();
    }

    /** Есть ли достижимая клетка вплотную к прямоугольнику (по стороне, не по диагонали). */
    static boolean besideAny(int x0, int y0, int w, int h, Set<Cell> reach) {
        for (int y = y0; y < y0 + h; y++) {
            if (reach.contains(new Cell(x0 - 1, y)) || reach.contains(new Cell(x0 + w, y))) {
                return true;
            }
        }
        for (int x = x0; x < x0 + w; x++) {
            if (reach.contains(new Cell(x, y0 - 1)) || reach.contains(new Cell(x, y0 + h))) {
                return true;
            }
        }
        return false;
    }
}
