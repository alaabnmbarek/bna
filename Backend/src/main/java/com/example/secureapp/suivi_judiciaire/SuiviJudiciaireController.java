package com.example.secureapp.suivi_judiciaire;

import com.example.secureapp.suivi_judiciaire.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/suivi-judiciaire")
@RequiredArgsConstructor
public class SuiviJudiciaireController {

    private final SuiviJudiciaireService suiviJudiciaireService;

    @GetMapping("/affaires")
    @PreAuthorize("hasAnyRole('ADMIN', 'CTX_AGENT', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'AVOCAT')")
    public ResponseEntity<List<AffaireJudiciaireDto>> getAllAffaires(Authentication authentication) {
        return ResponseEntity.ok(suiviJudiciaireService.getAllAffaires(authentication));
    }

    @GetMapping("/dossier/{dossierId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CTX_AGENT', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'AVOCAT')")
    public ResponseEntity<List<AffaireJudiciaireDto>> getAffairesByDossier(@PathVariable("dossierId") Long dossierId, Authentication authentication) {
        return ResponseEntity.ok(suiviJudiciaireService.getAffairesByDossier(dossierId, authentication));
    }

    @PostMapping("/affaires")
    @PreAuthorize("hasAnyRole('ADMIN', 'CTX_AGENT', 'CHARGE_DOSSIER')")
    public ResponseEntity<AffaireJudiciaireDto> createAffaire(@RequestBody AffaireJudiciaireDto dto, Authentication authentication) {
        return ResponseEntity.ok(suiviJudiciaireService.createAffaire(dto, authentication));
    }

    @PostMapping("/audiences")
    @PreAuthorize("hasAnyRole('ADMIN', 'CTX_AGENT', 'CHARGE_DOSSIER')")
    public ResponseEntity<AudienceDto> scheduleAudience(@RequestBody AudienceDto dto, Authentication authentication) {
        return ResponseEntity.ok(suiviJudiciaireService.scheduleAudience(dto, authentication));
    }

    @PutMapping("/audiences/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CTX_AGENT', 'CHARGE_DOSSIER')")
    public ResponseEntity<AudienceDto> updateAudience(@PathVariable("id") Long id, @RequestBody AudienceDto dto, Authentication authentication) {
        return ResponseEntity.ok(suiviJudiciaireService.updateAudience(id, dto, authentication));
    }

    @GetMapping("/audiences/affaire/{affaireId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CTX_AGENT', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'AVOCAT')")
    public ResponseEntity<List<AudienceDto>> getAudiencesByAffaire(@PathVariable("affaireId") Long affaireId, Authentication authentication) {
        return ResponseEntity.ok(suiviJudiciaireService.getAudiencesByAffaire(affaireId, authentication));
    }

    @GetMapping("/audiencier")
    @PreAuthorize("hasAnyRole('ADMIN', 'CTX_AGENT', 'CHARGE_DOSSIER')")
    public ResponseEntity<List<AudienceDto>> getAudiencier(
            @RequestParam("start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam("end") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            Authentication authentication) {
        return ResponseEntity.ok(suiviJudiciaireService.getAudiencier(start, end, authentication));
    }

    @PostMapping("/jugements")
    @PreAuthorize("hasAnyRole('ADMIN', 'CTX_AGENT', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'AVOCAT')")
    public ResponseEntity<JugementDto> recordJugement(@RequestBody JugementDto dto, Authentication authentication) {
        return ResponseEntity.ok(suiviJudiciaireService.recordJugement(dto, authentication));
    }
}
