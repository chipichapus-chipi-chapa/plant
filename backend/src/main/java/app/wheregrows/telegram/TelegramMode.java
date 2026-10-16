package app.wheregrows.telegram;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/**
 * Режим входа. Задан токен бота ({@code TELEGRAM_BOT_TOKEN}) — игроки входят через Telegram Mini App,
 * у каждого свой прогресс. Не задан — локальный режим с единственным игроком без входа.
 */
public final class TelegramMode {

    public static final String TOKEN_PROPERTY = "telegram.bot-token";

    private TelegramMode() {
    }

    public static boolean enabled(Environment environment) {
        return StringUtils.hasText(environment.getProperty(TOKEN_PROPERTY));
    }

    public static final class On implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            return enabled(context.getEnvironment());
        }
    }

    public static final class Off implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            return !enabled(context.getEnvironment());
        }
    }
}
