package com.example.secureapp.suivi_judiciaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface JugementRepository extends JpaRepository<JugementEntity, Long> {
    Optional<JugementEntity> findByAffaireJudiciaireId(Long affaireId);
}
