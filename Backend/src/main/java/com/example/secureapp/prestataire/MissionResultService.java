package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.MissionResultDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class MissionResultService {
    private final MissionRepository missionRepository;
    private final MissionResultRepository missionResultRepository;

    public MissionResultService(MissionRepository missionRepository, MissionResultRepository missionResultRepository) {
        this.missionRepository = missionRepository;
        this.missionResultRepository = missionResultRepository;
    }

    @Transactional(readOnly = true)
    public MissionResultDto getByMission(Long missionId) {
        return missionResultRepository.findByMissionId(missionId).map(this::toDto).orElse(null);
    }

    @Transactional
    public MissionResultDto upsert(Long missionId, MissionResultDto dto) {
        MissionEntity mission = missionRepository.findById(missionId).orElseThrow(() -> new RuntimeException("Mission non trouvée"));
        MissionResultEntity entity = missionResultRepository.findByMissionId(missionId).orElseGet(() -> {
            MissionResultEntity e = new MissionResultEntity();
            e.setMission(mission);
            return e;
        });

        if (dto.getStatut() == null) throw new RuntimeException("Statut mission obligatoire");
        entity.setStatut(dto.getStatut());
        entity.setDateDebut(dto.getDateDebut());
        entity.setDateFin(dto.getDateFin());
        entity.setResultat(dto.getResultat());
        entity.setMontantRecuperee(dto.getMontantRecuperee());

        switch (dto.getStatut()) {
            case EN_COURS -> mission.setStatut(MissionStatus.EN_COURS);
            case TERMINEE -> mission.setStatut(MissionStatus.TERMINEE);
            case ECHOUEE -> mission.setStatut(MissionStatus.ECHOUEE);
        }
        missionRepository.save(mission);

        MissionResultEntity saved = missionResultRepository.save(entity);
        return toDto(saved);
    }

    @Transactional
    public MissionResultDto uploadProof(Long missionId, MultipartFile file) {
        if (file == null || file.isEmpty()) throw new RuntimeException("Fichier manquant");
        MissionEntity mission = missionRepository.findById(missionId).orElseThrow(() -> new RuntimeException("Mission non trouvée"));
        MissionResultEntity entity = missionResultRepository.findByMissionId(missionId).orElseGet(() -> {
            MissionResultEntity e = new MissionResultEntity();
            e.setMission(mission);
            e.setStatut(MissionResultStatus.EN_COURS);
            return e;
        });

        try {
            entity.setPreuve(file.getBytes());
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la lecture du fichier");
        }
        entity.setPreuveFileName(file.getOriginalFilename());
        entity.setPreuveContentType(file.getContentType());
        MissionResultEntity saved = missionResultRepository.save(entity);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public MissionResultEntity getEntityByMission(Long missionId) {
        return missionResultRepository.findByMissionId(missionId).orElse(null);
    }

    private MissionResultDto toDto(MissionResultEntity entity) {
        MissionResultDto dto = new MissionResultDto();
        dto.setId(entity.getId());
        dto.setMissionId(entity.getMission() != null ? entity.getMission().getId() : null);
        dto.setStatut(entity.getStatut());
        dto.setDateDebut(entity.getDateDebut());
        dto.setDateFin(entity.getDateFin());
        dto.setResultat(entity.getResultat());
        dto.setMontantRecuperee(entity.getMontantRecuperee());
        dto.setHasPreuve(entity.getPreuve() != null && entity.getPreuve().length > 0);
        dto.setPreuveFileName(entity.getPreuveFileName());
        dto.setPreuveContentType(entity.getPreuveContentType());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }
}

