package app.wheregrows.shop;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ShopPurchaseRepository extends JpaRepository<ShopPurchase, Long> {

    Optional<ShopPurchase> findByPlayerIdAndIdempotencyKey(long playerId, UUID idempotencyKey);
}
