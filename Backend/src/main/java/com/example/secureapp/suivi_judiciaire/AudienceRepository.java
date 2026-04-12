package com.example.secureapp.suivi_judiciaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AudienceRepository extends JpaRepository<AudienceEntity, Long> {
    List<AudienceEntity> findByAffaireJudiciaireIdOrderByDateAudienceAsc(Long affaireId);
    List<AudienceEntity> findByDateAudienceBetween(LocalDateTime start, LocalDateTime end);
}
