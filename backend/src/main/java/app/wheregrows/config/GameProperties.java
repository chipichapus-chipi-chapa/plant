package app.wheregrows.config;

import java.time.ZoneId;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Настройки игры из application.yml (префикс {@code game}). */
@ConfigurationProperties("game")
public record GameProperties(@DefaultValue Local local) {

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
}
