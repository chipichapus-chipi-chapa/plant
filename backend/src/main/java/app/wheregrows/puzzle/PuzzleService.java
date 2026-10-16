package app.wheregrows.puzzle;

import java.time.Clock;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.InvalidRequestException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Загадки. Комбинацию проверяет сервер: клиент знает только символы и число колёсиков.
 * Ошибаться можно сколько угодно — неверная попытка ничего не стоит (в игре нет наказаний).
 * Награда выдаётся один раз, вместе с отметкой «разгадано».
 */
@Service
public class PuzzleService {

    private final PuzzleRepository puzzles;
    private final PlayerPuzzleRepository solved;
    private final Inventory inventory;
    private final PlayerProfileRepository players;
    private final Clock clock;

    PuzzleService(PuzzleRepository puzzles, PlayerPuzzleRepository solved, Inventory inventory,
                  PlayerProfileRepository players, Clock clock) {
        this.puzzles = puzzles;
        this.solved = solved;
        this.inventory = inventory;
        this.players = players;
        this.clock = clock;
    }

    @Transactional
    public AttemptResult attempt(long playerId, String puzzleKey, List<String> answer) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        Puzzle puzzle = puzzles.findById(puzzleKey).orElseThrow(() -> new NotFoundException("Такой загадки нет."));

        if (solved.existsById(new PlayerPuzzle.Id(playerId, puzzleKey))) {
            return new AttemptResult(puzzleKey, true, "Замок уже открыт.", List.of());
        }
        List<String> symbols = puzzle.getSymbols().stream().map(Puzzle.Symbol::key).toList();
        if (answer.size() != puzzle.getDials() || !symbols.containsAll(answer)) {
            throw new InvalidRequestException("На замке " + puzzle.getDials() + " колёсика с другими символами.");
        }
        if (!answer.equals(puzzle.getAnswer())) {
            return new AttemptResult(puzzleKey, false, puzzle.getWrongText(), List.of());
        }

        List<ItemGrant> reward = puzzle.getRewards().stream().map(r -> new ItemGrant(r.itemKey(), r.quantity())).toList();
        inventory.grant(playerId, reward);
        solved.saveAndFlush(new PlayerPuzzle(playerId, puzzleKey, clock.instant()));
        return new AttemptResult(puzzleKey, true, puzzle.getSolvedText(), reward);
    }

    @Transactional(readOnly = true)
    public List<String> solvedPuzzles(long playerId) {
        return solved.findByIdPlayerId(playerId).stream().map(PlayerPuzzle::getPuzzleKey).sorted().toList();
    }
}
