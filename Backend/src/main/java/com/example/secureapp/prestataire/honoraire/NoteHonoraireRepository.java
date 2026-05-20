package com.example.secureapp.prestataire.honoraire;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoteHonoraireRepository extends JpaRepository<NoteHonoraireEntity, Long> {
    List<NoteHonoraireEntity> findByPrestataireIdOrderByCreatedAtDesc(Long prestataireId);
    boolean existsByPrestataireId(Long prestataireId);
}
