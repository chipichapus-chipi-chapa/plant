package app.wheregrows.state;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.economy.InventoryItemRepository;
import app.wheregrows.exploration.ExplorationService;
import app.wheregrows.garden.GardenService;
import app.wheregrows.habit.HabitService;
import app.wheregrows.magic.MagicService;
import app.wheregrows.mentor.MentorService;
import app.wheregrows.player.GameCalendar;
import app.wheregrows.player.PlayerProfile;
import app.wheregrows.player.PlayerProfileRepository;
import app.wheregrows.player.ProfileService;
import app.wheregrows.puzzle.PuzzleService;
import app.wheregrows.errand.ErrandService;
import app.wheregrows.gift.GiftService;
import app.wheregrows.story.BeaconService;
import app.wheregrows.story.BreadService;
import app.wheregrows.story.FogService;
import app.wheregrows.story.GlowService;
import app.wheregrows.story.NightService;
import app.wheregrows.testing.Testers;

@Service
class GameStateService {

    private final PlayerProfileRepository profiles;
    private final InventoryItemRepository inventory;
    private final HabitService habits;
    private final GameCalendar calendar;
    private final GardenService garden;
    private final MagicService magic;
    private final ExplorationService exploration;
    private final ProfileService profileService;
    private final MentorService mentor;
    private final PuzzleService puzzles;
    private final ErrandService errands;
    private final FogService fog;
    private final GlowService glow;
    private final GiftService gifts;
    private final BeaconService beacon;
    private final Testers testers;
    private final BreadService bread;
    private final NightService night;

    GameStateService(PlayerProfileRepository profiles, InventoryItemRepository inventory, HabitService habits,
                     GameCalendar calendar, GardenService garden, MagicService magic,
                     ExplorationService exploration, ProfileService profileService, MentorService mentor,
                     PuzzleService puzzles, ErrandService errands, FogService fog, Testers testers, BreadService bread, NightService night,
                     GlowService glow, GiftService gifts, BeaconService beacon) {
        this.beacon = beacon;
        this.glow = glow;
        this.gifts = gifts;
        this.night = night;
        this.bread = bread;
        this.fog = fog;
        this.testers = testers;
        this.puzzles = puzzles;
        this.errands = errands;
        this.mentor = mentor;
        this.profileService = profileService;
        this.magic = magic;
        this.exploration = exploration;
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
                new GameStateResponse.Player(profile.getDisplayName(), profile.getZone().getId(),
                        profile.isOnboarded(), profileService.appearanceOf(playerId)),
                calendar.today(profile),
                inventory.findByIdPlayerIdAndQuantityGreaterThanOrderByIdItemKey(playerId, 0).stream()
                        .map(item -> new GameStateResponse.InventoryEntry(item.getItemKey(), item.getQuantity()))
                        .toList(),
                habits.list(profile),
                habits.dailyRewards(profile),
                new GameStateResponse.Garden(garden.objects(playerId), garden.weeded(playerId)),
                magic.worldObjects(playerId).stream()
                        .map(w -> new GameStateResponse.WorldObject(w.getObjectKey(), w.getState()))
                        .toList(),
                exploration.searchedSpots(playerId),
                exploration.collection(playerId).stream()
                        .map(a -> new GameStateResponse.CollectedArtifact(a.getArtifactKey(), a.getFoundAt(),
                                a.getFoundWhere()))
                        .toList(),
                mentor.progress(playerId),
                puzzles.solvedPuzzles(playerId),
                errands.states(playerId),
                fog.state(playerId).orElse(null),
                glow.state(playerId).orElse(null),
                beacon.state(playerId).orElse(null),
                bread.state(playerId).orElse(null),
                night.isNight(playerId),
                testers.isTester(playerId),
                gifts.giftedToday(profile));
    }
}
