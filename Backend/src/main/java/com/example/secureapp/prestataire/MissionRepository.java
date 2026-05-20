package com.example.secureapp.prestataire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MissionRepository extends JpaRepository<MissionEntity, Long> {
    List<MissionEntity> findByPrestataireIdOrderByCreatedAtDesc(Long prestataireId);
    List<MissionEntity> findByPrestataireIdOrderByCreatedAtDesc(Long prestataireId, Pageable pageable);
    boolean existsByPrestataireId(Long prestataireId);

    List<MissionEntity> findByDossierReferenceOrderByCreatedAtDesc(String dossierReference);

    List<MissionEntity> findAllByOrderByCreatedAtDesc();
    List<MissionEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
