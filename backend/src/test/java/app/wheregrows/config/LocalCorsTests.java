package app.wheregrows.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import app.wheregrows.TestcontainersConfiguration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Локальный режим: фронтенд ходит через прокси Vite, и браузер прикладывает Origin к каждому POST.
 * Без списка разрешённых адресов сервер не должен отклонять такие запросы как «чужие» (раньше — 403 на всё).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "game.local.username=local-cors-test")
@AutoConfigureMockMvc
class LocalCorsTests {

    @Autowired
    MockMvc mvc;

    @Test
    void postFromTheDevServerIsNotRejected() throws Exception {
        mvc.perform(post("/api/test/resources").header("Origin", "http://localhost:5173"))
                .andExpect(status().isNoContent());
    }
}
