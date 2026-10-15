package app.wheregrows.content;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemDefinitionRepository extends JpaRepository<ItemDefinition, String> {

    /** Осколок нужной категории; в базе на категорию ровно один осколок. */
    Optional<ItemDefinition> findByKindAndCrystalCategory(ItemKind kind, String crystalCategory);
}
