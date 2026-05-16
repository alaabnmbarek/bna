package com.example.secureapp.contentieux;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RelanceRepository extends JpaRepository<RelanceEntity, Long> {
    List<RelanceEntity> findByDossierIdOrderByDateRelanceDesc(Long dossierId);
    long countByDossierId(Long dossierId);
}
