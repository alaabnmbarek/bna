package com.example.secureapp.prestataire.honoraire;

import com.example.secureapp.prestataire.honoraire.dto.NoteHonoraireDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/notes-honoraires")
public class NoteHonoraireController {
    private final NoteHonoraireService service;

    public NoteHonoraireController(NoteHonoraireService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT') or hasAnyAuthority('PRESTATAIRE_READ', 'ROLE_ADMIN', 'ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<List<NoteHonoraireDtos.NoteResponse>> getAll(
            Authentication authentication,
            @RequestParam(value = "prestataireId", required = false) Long prestataireId
    ) {
        if (prestataireId != null) return ResponseEntity.ok(service.listByPrestataire(prestataireId));
        if (service.isInternal(authentication)) return ResponseEntity.ok(service.getAll());
        return ResponseEntity.ok(service.listMine(authentication));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT', 'ADMIN', 'CHARGE_DOSSIER') or hasAnyAuthority('PRESTATAIRE_CREATE', 'ROLE_ADMIN')")
    public ResponseEntity<NoteHonoraireDtos.NoteResponse> create(Authentication authentication, @RequestBody NoteHonoraireDtos.CreateNoteRequest request) {
        return ResponseEntity.ok(service.create(authentication, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT', 'ADMIN', 'CHARGE_DOSSIER') or hasAnyAuthority('PRESTATAIRE_UPDATE', 'ROLE_ADMIN')")
    public ResponseEntity<NoteHonoraireDtos.NoteResponse> update(@PathVariable("id") Long id, @RequestBody NoteHonoraireDtos.CreateNoteRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT', 'ADMIN', 'CHARGE_DOSSIER') or hasAnyAuthority('PRESTATAIRE_UPDATE', 'ROLE_ADMIN')")
    public ResponseEntity<Void> submit(@PathVariable("id") Long id) {
        service.submit(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESPONSABLE_CONTENTIEUX') or hasAnyAuthority('ROLE_ADMIN', 'ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<Void> validate(@PathVariable("id") Long id) {
        service.validate(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESPONSABLE_CONTENTIEUX') or hasAnyAuthority('ROLE_ADMIN', 'ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<Void> reject(@PathVariable("id") Long id) {
        service.reject(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT', 'ADMIN', 'CHARGE_DOSSIER') or hasAnyAuthority('PRESTATAIRE_DELETE', 'ROLE_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable("id") Long id) {
        try {
            service.delete(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
