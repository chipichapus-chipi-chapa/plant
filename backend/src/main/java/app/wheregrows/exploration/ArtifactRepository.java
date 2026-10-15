package app.wheregrows.exploration;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtifactRepository extends JpaRepository<Artifact, String> {

    List<Artifact> findAllByOrderBySortOrderAsc();
}
