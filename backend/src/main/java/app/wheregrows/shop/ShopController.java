package app.wheregrows.shop;

import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import app.wheregrows.player.CurrentPlayer;

@RestController
class ShopController {

    private final ShopService service;
    private final CurrentPlayer currentPlayer;

    ShopController(ShopService service, CurrentPlayer currentPlayer) {
        this.service = service;
        this.currentPlayer = currentPlayer;
    }

    record PurchaseRequest(
            @NotBlank(message = "Выберите товар.")
            String itemKey,
            @Min(value = 1, message = "Купить можно от 1 штуки.")
            @Max(value = 20, message = "За раз — не больше 20 штук.")
            int quantity) {
    }

    /**
     * Покупка. Заголовок Idempotency-Key (UUID) обязателен: клиент создаёт его один раз
     * на нажатие «Купить». 201 — покупка совершена; 200 — это повтор, ничего не списано.
     * Список товаров с ценами отдаёт /api/catalog (предметы с price != null).
     */
    @PostMapping("/api/shop/purchases")
    ResponseEntity<PurchaseResult> purchase(@RequestHeader("Idempotency-Key") UUID idempotencyKey,
                                            @Valid @RequestBody PurchaseRequest request) {
        PurchaseResult result = service.purchase(currentPlayer.id(), idempotencyKey, request.itemKey(), request.quantity());
        return ResponseEntity.status(result.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(result);
    }
}
