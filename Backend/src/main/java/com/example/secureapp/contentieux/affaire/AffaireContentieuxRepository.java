package com.example.secureapp.contentieux.affaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface AffaireContentieuxRepository extends JpaRepository<AffaireContentieuxEntity, Long> {
    List<AffaireContentieuxEntity> findByDossierIdOrderByDateCreationDesc(Long dossierId);

    List<AffaireContentieuxEntity> findByDossierIdAndNumeroAffaireIsNullOrderByDateCreationAscIdAsc(Long dossierId);

    Optional<AffaireContentieuxEntity> findTopByNumeroAffaireStartingWithOrderByNumeroAffaireDesc(String prefix);

    @Query("""
            select a.numeroAffaire
            from AffaireContentieuxEntity a
            where a.numeroAffaire is not null
            group by a.numeroAffaire
            having count(a) > 1
            """)
    List<String> findDuplicateNumeroAffaireValues();

    List<AffaireContentieuxEntity> findByNumeroAffaireInOrderByIdAsc(List<String> numeros);
}
