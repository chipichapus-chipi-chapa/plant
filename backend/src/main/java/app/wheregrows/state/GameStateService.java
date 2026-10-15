package app.wheregrows.state;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.economy.InventoryItemRepository;
import app.wheregrows.garden.GardenService;
import app.wheregrows.habit.HabitService;
import app.wheregrows.magic.MagicService;
import app.wheregrows.player.GameCalendar;
import app.wheregrows.player.PlayerProfile;
import app.wheregrows.player.PlayerProfileRepository;

@Service
class GameStateService {

    private final PlayerProfileRepository profiles;
    private final InventoryItemRepository inventory;
    private final HabitService habits;
    private final GameCalendar calendar;
    private final GardenService garden;
    private final MagicService magic;

    GameStateService(PlayerProfileRepository profiles, InventoryItemRepository inventory, HabitService habits,
                     GameCalendar calendar, GardenService garden, MagicService magic) {
        this.magic = magic;
        this.profiles = profiles;
        this.inventory = inventory;
        this.habits = habits;
        this.calendar = calendar;
        this.garden = garden;
    }

    @Transactional(readOnly = true)
    GameStateResponse load(long playerId) {
        PlayerProfile profile = profiles.findById(playerId).orElseThrow();

        return new GameStateResponse(
                new GameStateResponse.Player(profile.getDisplayName(), profile.getZone().getId()),
                calendar.today(profile),
                inventory.findByIdPlayerIdAndQuantityGreaterThanOrderByIdItemKey(playerId, 0).stream()
                        .map(item -> new GameStateResponse.InventoryEntry(item.getItemKey(), item.getQuantity()))
                        .toList(),
                habits.list(profile),
                habits.dailyRewards(profile),
                new GameStateResponse.Garden(garden.objects(playerId)),
                magic.worldObjects(playerId).stream()
                        .map(w -> new GameStateResponse.WorldObject(w.getObjectKey(), w.getState()))
                        .toList());
    }
}
