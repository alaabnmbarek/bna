package com.example.secureapp.prestataire;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MissionResultRepository extends JpaRepository<MissionResultEntity, Long> {
    Optional<MissionResultEntity> findByMissionId(Long missionId);
}

