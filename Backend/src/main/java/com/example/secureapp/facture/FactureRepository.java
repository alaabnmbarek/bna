package com.example.secureapp.facture;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FactureRepository extends JpaRepository<FactureEntity, Long> {
    boolean existsByNumero(String numero);

    List<FactureEntity> findByPrestataireIdOrderByDateFactureDesc(Long prestataireId);
}
