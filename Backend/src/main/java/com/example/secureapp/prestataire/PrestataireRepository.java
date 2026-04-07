package com.example.secureapp.prestataire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PrestataireRepository extends JpaRepository<PrestataireEntity, Long>, JpaSpecificationExecutor<PrestataireEntity> {
}
