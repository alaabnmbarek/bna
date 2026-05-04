package com.example.secureapp.contentieux;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DossierContentieuxRepository extends JpaRepository<DossierContentieuxEntity, Long> {
    List<DossierContentieuxEntity> findByDeletedFalseOrderByCreatedAtDesc();
    List<DossierContentieuxEntity> findByDeletedFalseOrderByCreatedAtDesc(Pageable pageable);
    List<DossierContentieuxEntity> findByDeletedFalseAndChargeDossierIdOrderByCreatedAtDesc(Long chargeDossierId);

    @Query("""
            select d
            from DossierContentieuxEntity d
            where d.deleted = false
              and (
                   d.chargeDossierId = :chargeDossierId
                   or (d.chargeDossierId is null and lower(d.chargeDossier) = lower(:chargeLabel))
              )
            order by d.createdAt desc
            """)
    List<DossierContentieuxEntity> findAccessibleForCharge(
            @Param("chargeDossierId") Long chargeDossierId,
            @Param("chargeLabel") String chargeLabel
    );

    @Query("""
            select d
            from DossierContentieuxEntity d
            where d.deleted = false
              and (
                   d.chargeDossierId = :chargeDossierId
                   or (d.chargeDossierId is null and lower(d.chargeDossier) = lower(:chargeLabel))
              )
            order by d.createdAt desc
            """)
    List<DossierContentieuxEntity> findAccessibleForCharge(
            @Param("chargeDossierId") Long chargeDossierId,
            @Param("chargeLabel") String chargeLabel,
            Pageable pageable
    );

    Optional<DossierContentieuxEntity> findByReference(String reference);

    Optional<DossierContentieuxEntity> findTopByCompteActuelOrderByCreatedAtDesc(String compteActuel);
    Optional<DossierContentieuxEntity> findTopByAncienCompteOrderByCreatedAtDesc(String ancienCompte);

    Optional<DossierContentieuxEntity> findTopByReferenceStartingWithOrderByReferenceDesc(String prefix);
}
