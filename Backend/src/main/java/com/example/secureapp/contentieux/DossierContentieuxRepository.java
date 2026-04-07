package com.example.secureapp.contentieux;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DossierContentieuxRepository extends JpaRepository<DossierContentieuxEntity, Long> {
    List<DossierContentieuxEntity> findByDeletedFalseOrderByCreatedAtDesc();
    Optional<DossierContentieuxEntity> findTopByReferenceStartingWithOrderByReferenceDesc(String prefix);
}

