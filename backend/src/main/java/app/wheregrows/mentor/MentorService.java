package app.wheregrows.mentor;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.ConflictException;
import app.wheregrows.common.NotFoundException;
import app.wheregrows.economy.Inventory;
import app.wheregrows.economy.ItemGrant;
import app.wheregrows.player.PlayerProfileRepository;

/**
 * Наставник: какой разговор сейчас уместен и что происходит, когда он закончен.
 *
 * <p>Порядок: знакомство → шаги обучения по очереди (подсказка, пока шаг не сделан; благодарность,
 * когда сделан) → случайные фразы. Завершить можно только тот разговор, который сейчас уместен,
 * — так нельзя «проскочить» шаг или получить подарок дважды.
 */
@Service
public class MentorService {

    static final String MET_FLAG = "met_vereshk";

    private final MentorContentLoader loader;
    private final PlayerFlagRepository flags;
    private final TutorialConditions conditions;
    private final Inventory inventory;
    private final PlayerProfileRepository players;
    private final Clock clock;

    MentorService(MentorContentLoader loader, PlayerFlagRepository flags, TutorialConditions conditions,
                  Inventory inventory, PlayerProfileRepository players, Clock clock) {
        this.loader = loader;
        this.flags = flags;
        this.conditions = conditions;
        this.inventory = inventory;
        this.players = players;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public MentorProgress progress(long playerId) {
        MentorContent content = loader.content();
        Set<String> set = flagsOf(playerId);

        List<MentorProgress.StepState> steps = new ArrayList<>();
        String next = set.contains(MET_FLAG) ? null : content.intro();
        for (MentorContent.Step step : content.tutorial()) {
            boolean done = conditions.met(playerId, step);
            boolean acknowledged = set.contains("ack_" + step.key());
            boolean offered = step.offer() == null || set.contains("offered_" + step.key());
            steps.add(new MentorProgress.StepState(step.key(), done, acknowledged, offered));
            if (next == null && !acknowledged) {
                // поручение сначала надо получить; а если дело уже сделано заранее — Вереск сразу благодарит
                next = done ? step.done() : !offered ? step.offer() : step.hint();
            }
        }
        boolean news = next != null && (next.equals(content.intro()) || content.doneDialogues().contains(next)
                || content.offerDialogues().contains(next));
        return new MentorProgress(next, news, steps);
    }

    @Transactional
    public FinishResult finish(long playerId, String dialogueKey) {
        players.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        MentorContent content = loader.content();
        MentorContent.Dialogue dialogue = content.dialogues().get(dialogueKey);
        if (dialogue == null) {
            throw new NotFoundException("Такого разговора нет.");
        }
        String expected = progress(playerId).nextDialogue();
        // уместны: ожидаемый разговор, случайная фраза или пасхалка (облик игрока проверяет клиент — наград за неё нет)
        if (!dialogueKey.equals(expected) && !content.idle().contains(dialogueKey)
                && !content.secretsOrEmpty().containsValue(dialogueKey)) {
            throw new ConflictException("Вереск сейчас о другом.");
        }

        List<ItemGrant> gift = List.of();
        if (dialogue.onEnd() != null) {
            PlayerFlag.Id id = new PlayerFlag.Id(playerId, dialogue.onEnd());
            if (!flags.existsById(id)) {
                flags.saveAndFlush(new PlayerFlag(playerId, dialogue.onEnd(), clock.instant()));
                gift = dialogue.giftOrEmpty();
                inventory.grant(playerId, gift);
            }
        }
        return new FinishResult(dialogueKey, dialogue.onEnd(), gift);
    }

    private Set<String> flagsOf(long playerId) {
        return flags.findByIdPlayerId(playerId).stream().map(PlayerFlag::getFlag).collect(Collectors.toSet());
    }
}
