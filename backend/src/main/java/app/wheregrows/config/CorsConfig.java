package app.wheregrows.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * Фронтенд на GitHub Pages живёт на другом домене, поэтому браузеру нужно разрешение (CORS).
 * Адреса задаются через {@code GAME_CORS_ALLOWED_ORIGINS} через запятую; пусто — разрешений нет
 * (локально фронтенд ходит через прокси Vite с того же адреса).
 * <p>
 * Это фильтр с наивысшим приоритетом, а не настройка MVC: ответ 401 от входа через Telegram
 * тоже должен нести CORS-заголовки, иначе браузер спрячет его и покажет «нет сети».
 */
@Configuration(proxyBeanMethods = false)
class CorsConfig {

    @Bean
    FilterRegistrationBean<CorsFilter> corsFilter(@Value("${game.cors.allowed-origins:}") List<String> origins) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(origins.stream().map(String::trim).filter(o -> !o.isEmpty()).toList());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        // Idempotency-Key — у покупки в лавке: без него браузер не отправит ни одной покупки
        cors.setAllowedHeaders(List.of("Content-Type", "Accept", "Idempotency-Key", "X-Telegram-Init-Data", "X-Device-Token", "X-Timezone"));
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>(new CorsFilter(source));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}
