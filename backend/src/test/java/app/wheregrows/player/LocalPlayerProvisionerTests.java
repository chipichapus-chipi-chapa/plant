package app.wheregrows.player;

import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import app.wheregrows.TestcontainersConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class LocalPlayerProvisionerTests {

    private static final ZoneId ZONE = ZoneId.of("Europe/Moscow");

    @Autowired
    LocalPlayerProvisioner provisioner;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void repeatedProvisioningReturnsTheSamePlayer() {
        long first = provisioner.provision("repeat", "Садовник", ZONE);
        long second = provisioner.provision("repeat", "Другое имя", ZONE);

        assertThat(second).isEqualTo(first);
        assertThat(count("app_user WHERE username = 'repeat'")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT display_name FROM player_profile WHERE user_id = ?", String.class, first))
                .as("существующий профиль не перезаписывается")
                .isEqualTo("Садовник");
    }

    @Test
    void parallelProvisioningCreatesExactlyOnePlayer() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<Long>> calls = IntStream.range(0, 16)
                    .<Callable<Long>>mapToObj(i -> () -> provisioner.provision("race", "Садовник", ZONE))
                    .toList();
            Set<Long> ids = pool.invokeAll(calls).stream().map(LocalPlayerProvisionerTests::get).collect(Collectors.toSet());

            assertThat(ids).hasSize(1);
            assertThat(count("app_user WHERE username = 'race'")).isEqualTo(1);
            assertThat(count("player_profile WHERE user_id = " + ids.iterator().next())).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void newPlayerStartsWithEmptyPocketsButNoDebt() {
        long id = provisioner.provision("fresh", "Садовник", ZONE);

        assertThat(jdbc.queryForObject("SELECT coins FROM player_profile WHERE user_id = ?", Integer.class, id)).isZero();
        assertThat(count("inventory_item WHERE player_id = " + id)).isZero();
    }

    private int count(String fromWhere) {
        return jdbc.queryForObject("SELECT count(*) FROM " + fromWhere, Integer.class);
    }

    private static Long get(Future<Long> future) {
        try {
            return future.get();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
