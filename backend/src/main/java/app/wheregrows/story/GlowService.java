package app.wheregrows.story;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.garden.GardenMap;
import app.wheregrows.garden.GardenMaps;

/**
 * Грибница в Грибной лощине: с каждым днём, когда игрок отметил хотя бы одну привычку, в лощине загорается
 * ещё одно пятно грибницы. Как туман над озером, только наоборот — свет прибавляется и никогда не гаснет.
 * Считает сервер, по отметкам, которые он сам записал.
 */
@Service
public class GlowService {

    private final GardenMaps maps;
    private final ReturnDays days;

    GlowService(GardenMaps maps, ReturnDays days) {
        this.maps = maps;
        this.days = days;
    }

    /** Состояние грибницы; пусто, если ни на одной локации её нет. */
    @Transactional(readOnly = true)
    public Optional<GlowState> state(long playerId) {
        return maps.glowing().map(map -> {
            GardenMap.Glow glow = map.glow();
            return days.since(playerId, glow.after())
                    .map(d -> new GlowState(map.key(), true, (int) Math.min(d, glow.days()), glow.days()))
                    .orElse(new GlowState(map.key(), false, 0, glow.days()));
        });
    }

    /** map — где грибница; days — сколько пятен горит; разгорелась вся, когда days == needed. */
    public record GlowState(String map, boolean started, int days, int needed) {

        public boolean lit() {
            return started && days >= needed;
        }
    }
}
