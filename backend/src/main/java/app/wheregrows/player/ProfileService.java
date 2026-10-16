package app.wheregrows.player;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.wheregrows.common.InvalidRequestException;
import app.wheregrows.common.NotFoundException;

/** Имя и внешность персонажа. Варианты проверяются по каталогу: выдуманный вариант сохранить нельзя. */
@Service
public class ProfileService {

    private final PlayerProfileRepository profiles;
    private final AppearanceSlotRepository slots;
    private final PlayerAppearanceRepository appearance;
    private final Clock clock;

    ProfileService(PlayerProfileRepository profiles, AppearanceSlotRepository slots,
                   PlayerAppearanceRepository appearance, Clock clock) {
        this.profiles = profiles;
        this.slots = slots;
        this.appearance = appearance;
        this.clock = clock;
    }

    /** Облик игрока: выбранные варианты, а для невыбранных слотов — варианты по умолчанию. */
    @Transactional(readOnly = true)
    public Map<String, String> appearanceOf(long playerId) {
        Map<String, String> chosen = appearance.findByIdPlayerId(playerId).stream()
                .collect(Collectors.toMap(PlayerAppearance::getSlotKey, PlayerAppearance::getOptionKey));
        Map<String, String> result = new LinkedHashMap<>();
        for (AppearanceSlot slot : slots.findAllByOrderBySortOrderAsc()) {
            String option = chosen.get(slot.getKey());
            result.put(slot.getKey(), option != null && slot.hasOption(option) ? option : slot.defaultOption());
        }
        return result;
    }

    /**
     * Сохраняет имя и облик. Слоты, которых нет в запросе, не меняются.
     * Первое сохранение отмечает, что персонаж создан.
     */
    @Transactional
    public void update(long playerId, String rawName, Map<String, String> requested) {
        PlayerProfile profile = profiles.lockById(playerId).orElseThrow(() -> new NotFoundException("Игрок не найден."));
        Map<String, AppearanceSlot> catalog = slots.findAll().stream()
                .collect(Collectors.toMap(AppearanceSlot::getKey, Function.identity()));

        for (Map.Entry<String, String> entry : requested.entrySet()) {
            AppearanceSlot slot = catalog.get(entry.getKey());
            if (slot == null) {
                throw new InvalidRequestException("Неизвестная часть облика: " + entry.getKey() + ".");
            }
            if (!slot.hasOption(entry.getValue())) {
                throw new InvalidRequestException("Для «" + slot.getName() + "» нет варианта " + entry.getValue() + ".");
            }
        }

        profile.rename(rawName.strip().replaceAll("\\s+", " "));
        Map<String, PlayerAppearance> current = appearance.findByIdPlayerId(playerId).stream()
                .collect(Collectors.toMap(PlayerAppearance::getSlotKey, Function.identity()));
        List<PlayerAppearance> changed = requested.entrySet().stream().map(entry -> {
            PlayerAppearance row = current.get(entry.getKey());
            if (row == null) {
                return new PlayerAppearance(playerId, entry.getKey(), entry.getValue());
            }
            row.choose(entry.getValue());
            return row;
        }).toList();
        appearance.saveAll(changed);
        profile.markOnboarded(clock.instant());
    }
}
