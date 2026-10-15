package app.wheregrows.magic;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecipeRepository extends JpaRepository<Recipe, String> {

    List<Recipe> findAllByOrderBySortOrderAsc();
}
