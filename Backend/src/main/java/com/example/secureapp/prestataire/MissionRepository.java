package com.example.secureapp.prestataire;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MissionRepository extends JpaRepository<MissionEntity, Long> {
    List<MissionEntity> findByPrestataireIdOrderByCreatedAtDesc(Long prestataireId);

    List<MissionEntity> findByDossierReferenceOrderByCreatedAtDesc(String dossierReference);

    List<MissionEntity> findAllByOrderByCreatedAtDesc();
}
