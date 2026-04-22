package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.MissionDto;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class MissionController {
    private static final Logger log = LoggerFactory.getLogger(MissionController.class);
    private final MissionService missionService;
    private final UserRepository userRepository;
    private final PrestataireRepository prestataireRepository;

    public MissionController(MissionService missionService, UserRepository userRepository, PrestataireRepository prestataireRepository) {
        this.missionService = missionService;
        this.userRepository = userRepository;
        this.prestataireRepository = prestataireRepository;
    }

    @GetMapping("/api/prestataires/{prestataireId}/missions")
    @PreAuthorize("hasAuthority('MISSION_READ')")
    public ResponseEntity<List<MissionDto>> listByPrestataire(@PathVariable("prestataireId") Long prestataireId, Authentication authentication) {
        if (!isInternal(authentication)) {
            Long pid = resolvePrestataireId(authentication);
            if (!prestataireId.equals(pid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        return ResponseEntity.ok(missionService.listByPrestataire(prestataireId));
    }

    @GetMapping("/api/missions")
    @PreAuthorize("hasAnyRole('ADMIN','CHARGE_DOSSIER','RESPONSABLE_CONTENTIEUX') or hasAnyAuthority('ROLE_ADMIN','ROLE_CHARGE_DOSSIER','ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<List<MissionDto>> listAll() {
        return ResponseEntity.ok(missionService.listAll());
    }

    @GetMapping("/api/missions/my")
    @PreAuthorize("hasAuthority('MISSION_READ') or hasAnyRole('AVOCAT','HUISSIER','EXPERT') or hasAnyAuthority('ROLE_AVOCAT','ROLE_HUISSIER','ROLE_EXPERT')")
    public ResponseEntity<List<MissionDto>> listMine(Authentication authentication) {
        Long pid = resolvePrestataireId(authentication);
        return ResponseEntity.ok(missionService.listByPrestataire(pid));
    }

    @PostMapping("/api/prestataires/{prestataireId}/missions")
    @PreAuthorize("hasAuthority('MISSION_CREATE')")
    public ResponseEntity<?> createForPrestataire(
            @PathVariable("prestataireId") Long prestataireId,
            @RequestBody MissionDto dto,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : null;
        try {
            log.info("mission.create request prestataireId={} user={} procedureId={} dossierRef={} typeMission={} codeMission={}",
                    prestataireId, username, dto.getProcedureId(), dto.getDossierReference(), dto.getTypeMission(), dto.getCodeMission());
            return ResponseEntity.ok(missionService.createForPrestataire(prestataireId, dto, username));
        } catch (RuntimeException ex) {
            log.warn("mission.create failed prestataireId={} user={} message={}", prestataireId, username, ex.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PatchMapping("/api/missions/{missionId}")
    @PreAuthorize("hasAuthority('MISSION_UPDATE')")
    public ResponseEntity<MissionDto> updateMission(@PathVariable("missionId") Long missionId, @RequestBody MissionDto dto) {
        return ResponseEntity.ok(missionService.update(missionId, dto));
    }

    private Long resolvePrestataireId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new RuntimeException("Utilisateur non authentifié");
        }
        String username = authentication.getName();
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        String email = user.getEmail();
        if (email == null || email.isBlank()) email = username;
        PrestataireEntity p = prestataireRepository.findFirstByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Prestataire lié au compte introuvable (vérifiez l'email du profil et du prestataire)"));
        return p.getId();
    }

    private boolean isInternal(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "ROLE_ADMIN".equals(v) || "ROLE_CHARGE_DOSSIER".equals(v) || "ROLE_RESPONSABLE_CONTENTIEUX".equals(v)
                    || "ADMIN".equals(v) || "CHARGE_DOSSIER".equals(v) || "RESPONSABLE_CONTENTIEUX".equals(v);
        });
    }
}
