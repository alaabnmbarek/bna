package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.MissionDto;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireEntity;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MissionService {
    private final MissionRepository missionRepository;
    private final PrestataireRepository prestataireRepository;
    private final AffaireJudiciaireRepository affaireJudiciaireRepository;
    private final DossierContentieuxRepository dossierContentieuxRepository;

    public MissionService(MissionRepository missionRepository, PrestataireRepository prestataireRepository, AffaireJudiciaireRepository affaireJudiciaireRepository, DossierContentieuxRepository dossierContentieuxRepository) {
        this.missionRepository = missionRepository;
        this.prestataireRepository = prestataireRepository;
        this.affaireJudiciaireRepository = affaireJudiciaireRepository;
        this.dossierContentieuxRepository = dossierContentieuxRepository;
    }

    @Transactional
    public List<MissionDto> listByPrestataire(Long prestataireId) {
        List<MissionEntity> rows = missionRepository.findByPrestataireIdOrderByCreatedAtDesc(prestataireId);
        backfill(rows);
        return rows.stream().map(this::toDto).toList();
    }

    @Transactional
    public List<MissionDto> listAll() {
        List<MissionEntity> rows = missionRepository.findAllByOrderByCreatedAtDesc();
        backfill(rows);
        return rows.stream().map(this::toDto).toList();
    }

    @Transactional
    public MissionDto createForPrestataire(Long prestataireId, MissionDto dto, String assigneeUsername) {
        PrestataireEntity prestataire = prestataireRepository.findById(prestataireId).orElseThrow(() -> new RuntimeException("Prestataire non trouvé"));
        MissionEntity entity = new MissionEntity();
        entity.setPrestataire(prestataire);
        entity.setTypeMission(dto.getTypeMission() != null ? dto.getTypeMission() : null);
        entity.setTitre(dto.getTitre());
        entity.setDescription(dto.getDescription());
        entity.setDossierReference(dto.getDossierReference());
        entity.setDureeEstimee(dto.getDureeEstimee());

        if (dto.getProcedureId() != null) {
            AffaireJudiciaireEntity procedure = affaireJudiciaireRepository.findById(dto.getProcedureId())
                    .orElseThrow(() -> new RuntimeException("Procédure non trouvée"));
            entity.setProcedure(procedure);
            if (procedure.getDossierContentieux() != null) {
                entity.setDossierReference(procedure.getDossierContentieux().getReference());
            }
        }
        if (entity.getTypeMission() == null) {
            entity.setTypeMission(inferType(entity.getTitre(), entity.getDescription(), entity.getProcedure()));
        }

        entity.setStatut(dto.getStatut() != null ? dto.getStatut() : MissionStatus.ASSIGNEE);
        entity.setDateDebut(dto.getDateDebut());
        entity.setDateEcheance(dto.getDateEcheance());
        entity.setDateFin(dto.getDateFin());
        entity.setAssigneeParUsername(assigneeUsername);
        entity.setCout(dto.getCout());
        MissionEntity saved = missionRepository.save(entity);
        if (dto.getCodeMission() != null && !dto.getCodeMission().isBlank()) {
            saved.setCodeMission(dto.getCodeMission().trim());
            saved = missionRepository.save(saved);
        } else if (saved.getCodeMission() == null || saved.getCodeMission().isBlank()) {
            saved.setCodeMission(generateCode(saved.getId(), saved.getCreatedAt()));
            saved = missionRepository.save(saved);
        }
        return toDto(saved);
    }

    @Transactional
    public MissionDto update(Long missionId, MissionDto dto) {
        MissionEntity entity = missionRepository.findById(missionId).orElseThrow(() -> new RuntimeException("Mission non trouvée"));
        if (dto.getTypeMission() != null) entity.setTypeMission(dto.getTypeMission());
        if (dto.getCodeMission() != null) entity.setCodeMission(dto.getCodeMission());
        if (dto.getTitre() != null) entity.setTitre(dto.getTitre());
        if (dto.getDescription() != null) entity.setDescription(dto.getDescription());
        if (dto.getDossierReference() != null) entity.setDossierReference(dto.getDossierReference());
        if (dto.getDureeEstimee() != null) entity.setDureeEstimee(dto.getDureeEstimee());
        if (dto.getProcedureId() != null) {
            AffaireJudiciaireEntity procedure = affaireJudiciaireRepository.findById(dto.getProcedureId())
                    .orElseThrow(() -> new RuntimeException("Procédure non trouvée"));
            entity.setProcedure(procedure);
            if (procedure.getDossierContentieux() != null) {
                entity.setDossierReference(procedure.getDossierContentieux().getReference());
            }
        }
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
        if (saved.getTypeMission() == null) {
            saved.setTypeMission(inferType(saved.getTitre(), saved.getDescription(), saved.getProcedure()));
        }
        if (saved.getCodeMission() == null || saved.getCodeMission().isBlank()) {
            saved.setCodeMission(generateCode(saved.getId(), saved.getCreatedAt()));
        }
        saved = missionRepository.save(saved);
        return toDto(saved);
    }

    private void backfill(List<MissionEntity> rows) {
        for (MissionEntity m : rows) {
            boolean changed = false;

            if (m.getTypeMission() == null) {
                m.setTypeMission(inferType(m.getTitre(), m.getDescription(), m.getProcedure()));
                changed = true;
            }
            if (m.getCodeMission() == null || m.getCodeMission().isBlank()) {
                m.setCodeMission(generateCode(m.getId(), m.getCreatedAt()));
                changed = true;
            }
            if (m.getProcedure() == null && m.getDossierReference() != null && !m.getDossierReference().isBlank()) {
                dossierContentieuxRepository.findByReference(m.getDossierReference())
                        .or(() -> dossierContentieuxRepository.findTopByCompteActuelOrderByCreatedAtDesc(m.getDossierReference()))
                        .or(() -> dossierContentieuxRepository.findTopByAncienCompteOrderByCreatedAtDesc(m.getDossierReference()))
                        .ifPresent(d -> {
                            List<AffaireJudiciaireEntity> procs = affaireJudiciaireRepository.findByDossierContentieuxId(d.getId());
                            AffaireJudiciaireEntity picked = null;
                            for (AffaireJudiciaireEntity p : procs) {
                                if (picked == null) picked = p;
                                else if (p.getCreatedAt() != null && picked.getCreatedAt() != null && p.getCreatedAt().isAfter(picked.getCreatedAt())) picked = p;
                                else if (picked.getCreatedAt() == null && p.getCreatedAt() != null) picked = p;
                            }
                            if (picked != null) {
                                m.setProcedure(picked);
                            }
                        });
                if (m.getProcedure() != null) {
                    if (m.getTypeMission() == null) {
                        m.setTypeMission(inferType(m.getTitre(), m.getDescription(), m.getProcedure()));
                    }
                    changed = true;
                }
            }
            if (changed) missionRepository.save(m);
        }
    }

    private MissionType inferType(String titre, String description, AffaireJudiciaireEntity procedure) {
        String t = ((titre != null ? titre : "") + " " + (description != null ? description : "")).toLowerCase();
        if (t.contains("assignation")) return MissionType.MISSION_ASSIGNATION;
        if (t.contains("recouvrement")) return MissionType.MISSION_RECOUVREMENT_JUDICIAIRE;
        if (t.contains("signification")) return MissionType.MISSION_SIGNIFICATION;
        if (t.contains("expertise")) return MissionType.MISSION_EXPERTISE;
        if (procedure != null && procedure.getTypeProcedure() != null) {
            switch (procedure.getTypeProcedure()) {
                case ASSIGNATION -> { return MissionType.MISSION_ASSIGNATION; }
                case SAISIE_ARRET, SAISIE_IMMOBILIERE, SAISIE_MOBILIERE -> { return MissionType.MISSION_SIGNIFICATION; }
                default -> { return MissionType.MISSION_RECOUVREMENT_JUDICIAIRE; }
            }
        }
        return MissionType.MISSION_RECOUVREMENT_JUDICIAIRE;
    }

    private String generateCode(Long id, LocalDateTime createdAt) {
        int year = createdAt != null ? createdAt.getYear() : LocalDateTime.now().getYear();
        String suffix = id != null ? String.format("%04d", id) : "0000";
        return "MIS-" + year + "-" + suffix;
    }

    private MissionDto toDto(MissionEntity entity) {
        MissionDto dto = new MissionDto();
        dto.setId(entity.getId());
        dto.setPrestataireId(entity.getPrestataire() != null ? entity.getPrestataire().getId() : null);
        dto.setTypeMission(entity.getTypeMission());
        dto.setCodeMission(entity.getCodeMission());
        dto.setTitre(entity.getTitre());
        dto.setDescription(entity.getDescription());
        dto.setDossierReference(entity.getDossierReference());
        dto.setDureeEstimee(entity.getDureeEstimee());
        if (entity.getProcedure() != null) {
            dto.setProcedureId(entity.getProcedure().getId());
            dto.setProcedureType(entity.getProcedure().getTypeProcedure());
            dto.setAffaireNumero(entity.getProcedure().getReferenceTribunal());
            dto.setProcedureTribunal(entity.getProcedure().getTribunal());
        }
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
