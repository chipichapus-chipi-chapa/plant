package app.wheregrows.config;

import java.time.ZoneId;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Настройки игры из application.yml (префикс {@code game}).
 * Все числа баланса собраны здесь, чтобы их можно было менять без правки кода.
 */
@ConfigurationProperties("game")
public record GameProperties(
        @DefaultValue Local local,
        @DefaultValue Rewards rewards,
        @DefaultValue Habits habits) {

    /**
     * Локальный режим разработки: единственный игрок без входа.
     * Часовой пояс по умолчанию — системный; он определяет, какой у игрока «сегодня».
     */
    public record Local(
            @DefaultValue("local") String username,
            @DefaultValue("Садовник") String displayName,
            ZoneId timezone) {

        public Local {
            if (timezone == null) {
                timezone = ZoneId.systemDefault();
            }
        }
    }

    /**
     * Награды за отметку привычки.
     *
     * @param lifeSeedsPerCompletion сколько Семян жизни приносит отметка
     * @param shardsPerCompletion    сколько осколков категории привычки (если категория задана)
     * @param dailyRewardedCompletions сколько отметок в день приносят награду; остальные просто засчитываются
     */
    public record Rewards(
            @DefaultValue("3") int lifeSeedsPerCompletion,
            @DefaultValue("1") int shardsPerCompletion,
            @DefaultValue("6") int dailyRewardedCompletions) {
    }

    /**
     * @param maxActive   сколько активных привычек может быть одновременно
     * @param historyDays на сколько дней назад можно поставить или снять отметку в трекере (без награды)
     */
    public record Habits(@DefaultValue("30") int maxActive, @DefaultValue("62") int historyDays) {
    }
}
