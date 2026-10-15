package app.wheregrows.state;

import java.time.Clock;
import java.time.LocalDate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.economy.InventoryItemRepository;
import app.wheregrows.player.PlayerProfile;
import app.wheregrows.player.PlayerProfileRepository;

@Service
class GameStateService {

    private final PlayerProfileRepository profiles;
    private final InventoryItemRepository inventory;
    private final Clock clock;

    GameStateService(PlayerProfileRepository profiles, InventoryItemRepository inventory, Clock clock) {
        this.profiles = profiles;
        this.inventory = inventory;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    GameStateResponse load(long playerId) {
        PlayerProfile profile = profiles.findById(playerId).orElseThrow();
        LocalDate today = LocalDate.now(clock.withZone(profile.getZone()));

        return new GameStateResponse(
                new GameStateResponse.Player(profile.getDisplayName(), profile.getCoins(), profile.getZone().getId()),
                today,
                inventory.findByIdPlayerIdAndQuantityGreaterThanOrderByIdItemKey(playerId, 0).stream()
                        .map(item -> new GameStateResponse.InventoryEntry(item.getItemKey(), item.getQuantity()))
                        .toList());
    }
}
