package app.wheregrows.player;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class LocalModeGuardTests {

    @Test
    void localModeListensOnlyOnLoopback() {
        assertThatCode(() -> LocalCurrentPlayer.requireLoopback("127.0.0.1")).doesNotThrowAnyException();
        assertThatCode(() -> LocalCurrentPlayer.requireLoopback("::1")).doesNotThrowAnyException();
    }

    @Test
    void localModeRefusesToOpenToTheNetwork() {
        assertThatThrownBy(() -> LocalCurrentPlayer.requireLoopback("0.0.0.0"))
                .hasMessageContaining("TELEGRAM_BOT_TOKEN");
        assertThatThrownBy(() -> LocalCurrentPlayer.requireLoopback(null))
                .isInstanceOf(IllegalStateException.class);
    }
}
