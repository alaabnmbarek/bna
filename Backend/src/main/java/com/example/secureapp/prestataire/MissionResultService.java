package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.MissionResultDto;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;

import java.io.IOException;

@Service
public class MissionResultService {
    private final MissionRepository missionRepository;
    private final MissionResultRepository missionResultRepository;
    private final UserRepository userRepository;
    private final PrestataireRepository prestataireRepository;

    public MissionResultService(MissionRepository missionRepository, MissionResultRepository missionResultRepository, UserRepository userRepository, PrestataireRepository prestataireRepository) {
        this.missionRepository = missionRepository;
        this.missionResultRepository = missionResultRepository;
        this.userRepository = userRepository;
        this.prestataireRepository = prestataireRepository;
    }

    @Transactional(readOnly = true)
    public MissionResultDto getByMission(Long missionId, Authentication authentication) {
        MissionEntity mission = missionRepository.findById(missionId).orElseThrow(() -> new RuntimeException("Mission non trouvée"));
        ensureMissionAccess(mission, authentication);
        return missionResultRepository.findByMissionId(missionId).map(this::toDto).orElse(null);
    }

    @Transactional
    public MissionResultDto upsert(Long missionId, MissionResultDto dto, Authentication authentication) {
        System.out.println("DEBUG: upsert missionId=" + missionId + " status=" + dto.getStatut());
        MissionEntity mission = missionRepository.findById(missionId).orElseThrow(() -> new RuntimeException("Mission non trouvée"));
        ensureMissionAccess(mission, authentication);
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

        System.out.println("DEBUG: Setting mission status to: " + dto.getStatut());
        switch (dto.getStatut()) {
            case EN_COURS -> mission.setStatut(MissionStatus.EN_COURS);
            case TERMINEE -> mission.setStatut(MissionStatus.TERMINEE);
            case ECHOUEE -> mission.setStatut(MissionStatus.ECHOUEE);
        }
        
        try {
            missionRepository.save(mission);
        } catch (Exception e) {
            System.err.println("DEBUG ERROR saving mission: " + e.getMessage());
            throw e;
        }

        MissionResultEntity saved = missionResultRepository.save(entity);
        return toDto(saved);
    }

    @Transactional
    public MissionResultDto uploadProof(Long missionId, MultipartFile file, Authentication authentication) {
        if (file == null || file.isEmpty()) throw new RuntimeException("Fichier manquant");
        MissionEntity mission = missionRepository.findById(missionId).orElseThrow(() -> new RuntimeException("Mission non trouvée"));
        ensureMissionAccess(mission, authentication);
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
    public MissionResultEntity getEntityByMission(Long missionId, Authentication authentication) {
        MissionEntity mission = missionRepository.findById(missionId).orElseThrow(() -> new RuntimeException("Mission non trouvée"));
        ensureMissionAccess(mission, authentication);
        return missionResultRepository.findByMissionId(missionId).orElse(null);
    }

    private void ensureMissionAccess(MissionEntity mission, Authentication authentication) {
        if (authentication == null) throw new RuntimeException("Utilisateur non authentifié");
        if (isInternal(authentication)) return;
        PrestataireEntity p = resolvePrestataire(authentication);
        Long ownerId = mission.getPrestataire() != null ? mission.getPrestataire().getId() : null;
        if (ownerId == null || !ownerId.equals(p.getId())) {
            throw new AccessDeniedException("Accès refusé");
        }
    }

    private boolean isInternal(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "ROLE_ADMIN".equals(v) || "ROLE_CHARGE_DOSSIER".equals(v) || "ROLE_RESPONSABLE_CONTENTIEUX".equals(v)
                    || "ADMIN".equals(v) || "CHARGE_DOSSIER".equals(v) || "RESPONSABLE_CONTENTIEUX".equals(v);
        });
    }

    private PrestataireEntity resolvePrestataire(Authentication authentication) {
        String username = authentication.getName();
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non authentifié");
        UserEntity user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        String email = user.getEmail();
        if (email == null || email.isBlank()) email = username;
        return prestataireRepository.findFirstByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Prestataire lié au compte introuvable (vérifiez l'email du profil et du prestataire)"));
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
