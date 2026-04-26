package com.example.secureapp.suivi_judiciaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface AffaireJudiciaireRepository extends JpaRepository<AffaireJudiciaireEntity, Long> {
    List<AffaireJudiciaireEntity> findByDossierContentieuxId(Long dossierId);
    List<AffaireJudiciaireEntity> findByAvocatId(Long avocatId);
    List<AffaireJudiciaireEntity> findByHuissierId(Long huissierId);

    Optional<AffaireJudiciaireEntity> findFirstByReferenceTribunalIgnoreCase(String referenceTribunal);
}
