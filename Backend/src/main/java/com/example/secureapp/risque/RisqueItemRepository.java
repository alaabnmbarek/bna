package com.example.secureapp.risque;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RisqueItemRepository extends JpaRepository<RisqueItemEntity, Long> {
    List<RisqueItemEntity> findByDossierIdAndCategoryOrderByUpdatedAtDesc(Long dossierId, RisqueCategory category);
}

