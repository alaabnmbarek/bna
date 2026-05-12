package com.example.secureapp.facture;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface FactureRepository extends JpaRepository<FactureEntity, Long> {
    boolean existsByNumero(String numero);
    boolean existsByChequeNumeroIgnoreCase(String chequeNumero);
    boolean existsByChequeNumeroIgnoreCaseAndIdNot(String chequeNumero, Long id);

    List<FactureEntity> findByPrestataireIdOrderByDateFactureDesc(Long prestataireId);
    List<FactureEntity> findByPrestataireIdOrderByDateFactureDesc(Long prestataireId, Pageable pageable);

    List<FactureEntity> findAllByOrderByDateFactureDesc(Pageable pageable);

    List<FactureEntity> findByNoteHonoraireIdInOrderByDateFactureDesc(List<Long> noteHonoraireIds);

    List<FactureEntity> findByPrestataireIdIsNull();
}
