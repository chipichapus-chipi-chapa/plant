package app.wheregrows.exploration;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.NotFoundException;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.magic.MagicService;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Исследование: каждое место находки обыскивается один раз. Повторный поиск ничего не даёт,
 * а место с условием (например, нужен свет пробуждённой чаши) просто подсказывает, чего не хватает.
 */
@Service
public class ExplorationService {

    private final DiscoverySpotRepository spots;
    private final PlayerDiscoveryRepository discoveries;
    private final ArtifactRepository artifacts;
    private final PlayerArtifactRepository collection;
    private final MagicService magic;
    private final Inventory inventory;
    private final PlayerProfileRepository players;
    private final Clock clock;

    ExplorationService(DiscoverySpotRepository spots, PlayerDiscoveryRepository discoveries,
                       ArtifactRepository artifacts, PlayerArtifactRepository collection, MagicService magic,
                       Inventory inventory, PlayerProfileRepository players, Clock clock) {
        this.spots = spots;
        this.discoveries = discoveries;
        this.artifacts = artifacts;
        this.collection = collection;
        this.magic = magic;
        this.inventory = inventory;
        this.players = players;
        this.clock = clock;
    }

    @Transactional
    public SearchResult search(long playerId, String spotKey) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        DiscoverySpot spot = spots.findById(spotKey).orElseThrow(() -> new NotFoundException("Здесь нечего искать."));

        if (discoveries.existsById(new PlayerDiscovery.Id(playerId, spotKey))) {
            return new SearchResult(spotKey, SearchResult.Outcome.EMPTY, spot.getEmptyText(), List.of(), null);
        }
        if (spot.getRequiresAwakened() != null && !magic.isAwakened(playerId, spot.getRequiresAwakened())) {
            return new SearchResult(spotKey, SearchResult.Outcome.LOCKED, spot.getLockedText(), List.of(), null);
        }

        Instant now = clock.instant();
        List<ItemGrant> reward = spot.getRewards().stream()
                .map(r -> new ItemGrant(r.itemKey(), r.quantity()))
                .toList();
        inventory.grant(playerId, reward);

        SearchResult.FoundArtifact found = null;
        if (spot.getArtifactKey() != null) {
            Artifact artifact = artifacts.findById(spot.getArtifactKey()).orElseThrow();
            // Уникальный артефакт: если он уже в коллекции (например, из другого места), второй не появится
            if (!collection.existsById(new PlayerArtifact.Id(playerId, artifact.getKey()))) {
                collection.save(new PlayerArtifact(playerId, artifact.getKey(), now, spotKey));
                found = new SearchResult.FoundArtifact(artifact.getKey(), artifact.getName());
            }
        }
        discoveries.saveAndFlush(new PlayerDiscovery(playerId, spotKey, now));
        return new SearchResult(spotKey, SearchResult.Outcome.FOUND, spot.getFoundText(), reward, found);
    }

    @Transactional(readOnly = true)
    public List<String> searchedSpots(long playerId) {
        return discoveries.findByIdPlayerId(playerId).stream().map(PlayerDiscovery::getSpotKey).sorted().toList();
    }

    @Transactional(readOnly = true)
    public List<PlayerArtifact> collection(long playerId) {
        return collection.findByIdPlayerIdOrderByFoundAt(playerId);
    }
}
