package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.MissionDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MissionService {
    private final MissionRepository missionRepository;
    private final PrestataireRepository prestataireRepository;

    public MissionService(MissionRepository missionRepository, PrestataireRepository prestataireRepository) {
        this.missionRepository = missionRepository;
        this.prestataireRepository = prestataireRepository;
    }

    @Transactional(readOnly = true)
    public List<MissionDto> listByPrestataire(Long prestataireId) {
        return missionRepository.findByPrestataireIdOrderByCreatedAtDesc(prestataireId).stream().map(this::toDto).toList();
    }

    @Transactional
    public MissionDto createForPrestataire(Long prestataireId, MissionDto dto, String assigneeUsername) {
        PrestataireEntity prestataire = prestataireRepository.findById(prestataireId).orElseThrow(() -> new RuntimeException("Prestataire non trouvé"));
        MissionEntity entity = new MissionEntity();
        entity.setPrestataire(prestataire);
        entity.setTitre(dto.getTitre());
        entity.setDescription(dto.getDescription());
        entity.setDossierReference(dto.getDossierReference());
        entity.setStatut(dto.getStatut() != null ? dto.getStatut() : MissionStatus.ASSIGNEE);
        entity.setDateDebut(dto.getDateDebut());
        entity.setDateEcheance(dto.getDateEcheance());
        entity.setDateFin(dto.getDateFin());
        entity.setAssigneeParUsername(assigneeUsername);
        entity.setCout(dto.getCout());
        MissionEntity saved = missionRepository.save(entity);
        return toDto(saved);
    }

    @Transactional
    public MissionDto update(Long missionId, MissionDto dto) {
        MissionEntity entity = missionRepository.findById(missionId).orElseThrow(() -> new RuntimeException("Mission non trouvée"));
        if (dto.getTitre() != null) entity.setTitre(dto.getTitre());
        if (dto.getDescription() != null) entity.setDescription(dto.getDescription());
        if (dto.getDossierReference() != null) entity.setDossierReference(dto.getDossierReference());
        if (dto.getStatut() != null) entity.setStatut(dto.getStatut());
        if (dto.getDateDebut() != null) entity.setDateDebut(dto.getDateDebut());
        if (dto.getDateEcheance() != null) entity.setDateEcheance(dto.getDateEcheance());
        if (dto.getDateFin() != null) entity.setDateFin(dto.getDateFin());
        if (dto.getCout() != null) entity.setCout(dto.getCout());
        if (dto.getNotePerformance() != null) {
            Integer note = dto.getNotePerformance();
            if (note < 1 || note > 5) throw new RuntimeException("La note doit être entre 1 et 5");
            entity.setNotePerformance(note);
        }
        if (dto.getCommentairePerformance() != null) entity.setCommentairePerformance(dto.getCommentairePerformance());
        MissionEntity saved = missionRepository.save(entity);
        return toDto(saved);
    }

    private MissionDto toDto(MissionEntity entity) {
        MissionDto dto = new MissionDto();
        dto.setId(entity.getId());
        dto.setPrestataireId(entity.getPrestataire() != null ? entity.getPrestataire().getId() : null);
        dto.setTitre(entity.getTitre());
        dto.setDescription(entity.getDescription());
        dto.setDossierReference(entity.getDossierReference());
        dto.setStatut(entity.getStatut());
        dto.setDateDebut(entity.getDateDebut());
        dto.setDateEcheance(entity.getDateEcheance());
        dto.setDateFin(entity.getDateFin());
        dto.setAssigneeParUsername(entity.getAssigneeParUsername());
        dto.setNotePerformance(entity.getNotePerformance());
        dto.setCommentairePerformance(entity.getCommentairePerformance());
        dto.setCout(entity.getCout());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }
}
