package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.MissionDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class MissionController {
    private static final Logger log = LoggerFactory.getLogger(MissionController.class);
    private final MissionService missionService;

    public MissionController(MissionService missionService) {
        this.missionService = missionService;
    }

    @GetMapping("/api/prestataires/{prestataireId}/missions")
    @PreAuthorize("hasAuthority('MISSION_READ')")
    public ResponseEntity<List<MissionDto>> listByPrestataire(@PathVariable("prestataireId") Long prestataireId) {
        return ResponseEntity.ok(missionService.listByPrestataire(prestataireId));
    }

    @GetMapping("/api/missions")
    @PreAuthorize("hasAuthority('MISSION_READ')")
    public ResponseEntity<List<MissionDto>> listAll() {
        return ResponseEntity.ok(missionService.listAll());
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
}
