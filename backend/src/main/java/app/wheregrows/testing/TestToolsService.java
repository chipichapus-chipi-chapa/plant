package app.wheregrows.testing;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ForbiddenException;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.errand.ErrandService;
import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;
import app.wheregrows.story.BeaconService;
import app.wheregrows.story.BreadService;
import app.wheregrows.story.FogService;
import app.wheregrows.story.NightService;

/**
 * Кнопки тестирования: чтобы проверить сюжет, не проходя его неделями. Меняют только сад самого тестировщика.
 * Туман «ускоряется» флагами {@value FogService#TEST_DAY}, а не поддельными отметками привычек —
 * так трекер привычек остаётся честным.
 */
@Service
public class TestToolsService {

    /** Таблицы с прогрессом игрока; облик и профиль остаются (сброс — это «новая игра», а не новый аккаунт). */
    private static final List<String> PROGRESS = List.of("habit_completion", "habit", "garden_object", "inventory_item",
            "player_artifact", "player_discovery", "player_flag", "player_puzzle", "player_tile", "player_world_object",
            "shop_purchase");

    private final Testers testers;
    private final JdbcClient db;
    private final Inventory inventory;
    private final GardenMaps maps;
    private final Clock clock;

    TestToolsService(Testers testers, JdbcClient db, Inventory inventory, GardenMaps maps, Clock clock) {
        this.testers = testers;
        this.db = db;
        this.inventory = inventory;
        this.maps = maps;
        this.clock = clock;
    }

    /** Ресурсы: Семена жизни, искры, по горсти каждого осколка и каждого пакетика семян. */
    @Transactional
    public void resources(long playerId) {
        check(playerId);
        inventory.grant(playerId, List.of(new ItemGrant("life_seed", 100), new ItemGrant("sun_spark", 10)));
        List<String> handfuls = db.sql("SELECT key FROM item_def WHERE kind IN ('SEED', 'SHARD') ORDER BY key")
                .query(String.class).list();
        inventory.grant(playerId, handfuls.stream().map(key -> new ItemGrant(key, 5)).toList());
    }

    /**
     * Все тропы до озера: калитка на восток, Хмур пропустил, сад поместья ожил (с этого момента начинается туман).
     * Пробуждаются постройки, от которых зависят двери и поручения-оживления.
     */
    @Transactional
    public void openPaths(long playerId) {
        check(playerId);
        for (GardenMap map : maps.all()) {
            for (GardenMap.Prop prop : map.props()) {
                if (prop.door() != null && prop.door().requires() != null) {
                    awaken(playerId, prop.door().requires());
                }
                if (prop.door() != null && prop.door().requiresErrand() != null) {
                    finishErrand(playerId, prop.door().requiresErrand());
                }
            }
        }
        // только то, что открывает проходы: сторож на тропе и поручения, которых ждут двери
        // (сад Мяты — к озеру, очаг Агаты — к плотине); сюжет дальше — проходить самому
        java.util.Set<String> gates = maps.all().stream().flatMap(m -> m.props().stream())
                .filter(p -> p.door() != null && p.door().requiresErrand() != null)
                .map(p -> p.door().requiresErrand())
                .collect(java.util.stream.Collectors.toSet());
        for (GardenMaps.NpcErrand e : maps.errands()) {
            // сторож стоит на тропе с самого начала (Хмур); садовник «уходит» в конце главы — его не трогаем
            if (e.errand().leaves() && e.npc().appearsAfter() == null) {
                finishErrand(playerId, e.errand().key());
            }
            if (gates.contains(e.errand().key())) {
                e.errand().propsOrEmpty().forEach(key -> awaken(playerId, key));
                finishErrand(playerId, e.errand().key());
            }
        }
    }

    /** Туман: как будто вы вернулись к привычкам ещё один день. */
    @Transactional
    public void fogDay(long playerId) {
        check(playerId);
        long n = db.sql("SELECT count(*) FROM player_flag WHERE player_id = ? AND flag LIKE ?")
                .params(playerId, FogService.TEST_DAY + "%").query(Long.class).single();
        flag(playerId, FogService.TEST_DAY + (n + 1));
    }

    /** Туман рассеялся: сразу столько «дней», сколько нужно. */
    @Transactional
    public void fogClear(long playerId) {
        check(playerId);
        int needed = maps.foggy().map(m -> m.fog().days()).orElse(0);
        for (int i = 0; i < needed; i++) {
            fogDay(playerId);
        }
    }

    /** «Сегодня суббота»: Агата испечёт хлеб в любой день (раз в неделю — как обычно). */
    @Transactional
    public void breadDay(long playerId) {
        check(playerId);
        flag(playerId, BreadService.TEST_DAY);
    }

    /** «Маяк: +окно»: загорается окно следующего кристалла, как будто отмечена привычка этого кристалла. */
    @Transactional
    public void beaconWindow(long playerId) {
        check(playerId);
        List<String> lit = db.sql("SELECT flag FROM player_flag WHERE player_id = ? AND flag LIKE ?")
                .params(playerId, BeaconService.TEST_WINDOW + "%").query(String.class).list();
        db.sql("SELECT key FROM crystal_category ORDER BY sort_order").query(String.class).list().stream()
                .filter(c -> !lit.contains(BeaconService.TEST_WINDOW + c))
                .findFirst()
                .ifPresent(c -> flag(playerId, BeaconService.TEST_WINDOW + c));
    }

    /** «Сейчас ночь» / «Вернуть время»: переключает ночь для тропки на Лунную поляну. */
    @Transactional
    public void night(long playerId) {
        check(playerId);
        int removed = db.sql("DELETE FROM player_flag WHERE player_id = ? AND flag = ?")
                .params(playerId, NightService.TEST_NIGHT).update();
        if (removed == 0) {
            flag(playerId, NightService.TEST_NIGHT);
        }
    }

    /** Новая игра: весь прогресс стирается, имя и облик остаются. */
    @Transactional
    public void reset(long playerId) {
        check(playerId);
        for (String table : PROGRESS) {
            db.sql("DELETE FROM " + table + " WHERE player_id = ?").param(playerId).update();
        }
    }

    private void check(long playerId) {
        if (!testers.isTester(playerId)) {
            throw new ForbiddenException("Кнопки тестирования доступны только тестировщикам.");
        }
    }

    private void awaken(long playerId, String objectKey) {
        db.sql("""
                        INSERT INTO player_world_object (player_id, object_key, state, changed_at)
                        VALUES (?, ?, 'AWAKENED', ?) ON CONFLICT DO NOTHING""")
                .params(playerId, objectKey, Timestamp.from(clock.instant())).update();
    }

    private void finishErrand(long playerId, String key) {
        flag(playerId, "errand_offered:" + key);
        flag(playerId, ErrandService.DONE + key);
    }

    private void flag(long playerId, String flag) {
        db.sql("INSERT INTO player_flag (player_id, flag, set_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING")
                .params(playerId, flag, Timestamp.from(clock.instant())).update();
    }
}
