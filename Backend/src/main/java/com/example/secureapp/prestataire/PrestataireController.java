package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.PrestataireDto;
import com.example.secureapp.prestataire.honoraire.NoteHonoraireService;
import com.example.secureapp.prestataire.honoraire.dto.NoteHonoraireDtos;
import com.example.secureapp.contentieux.DossierContentieuxEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prestataires")
public class PrestataireController {
    private final PrestataireService prestataireService;
    private final NoteHonoraireService noteHonoraireService;

    public PrestataireController(PrestataireService prestataireService, NoteHonoraireService noteHonoraireService) {
        this.prestataireService = prestataireService;
        this.noteHonoraireService = noteHonoraireService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PRESTATAIRE_READ')")
    public ResponseEntity<List<PrestataireDto>> list(
            @RequestParam(value = "type", required = false) PrestataireType type,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "actif", required = false) Boolean actif
    ) {
        return ResponseEntity.ok(prestataireService.list(type, q, actif));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PRESTATAIRE_READ')")
    public ResponseEntity<PrestataireDto> get(@PathVariable("id") Long id) {
        return ResponseEntity.ok(prestataireService.get(id));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('PRESTATAIRE','AVOCAT','HUISSIER','EXPERT','ADMIN','CHARGE_DOSSIER','RESPONSABLE_CONTENTIEUX') or hasAnyAuthority('PRESTATAIRE_READ','ROLE_ADMIN','ROLE_CHARGE_DOSSIER','ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<PrestataireDto> me(Authentication authentication) {
        return ResponseEntity.ok(prestataireService.getMe(authentication));
    }

    @GetMapping("/me/dossiers")
    @PreAuthorize("hasAnyRole('PRESTATAIRE','AVOCAT','HUISSIER','EXPERT','ADMIN','CHARGE_DOSSIER','RESPONSABLE_CONTENTIEUX') or hasAnyAuthority('PRESTATAIRE_READ','ROLE_ADMIN','ROLE_CHARGE_DOSSIER','ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<List<Map<String, Object>>> myDossiers(Authentication authentication) {
        List<DossierContentieuxEntity> dossiers = prestataireService.listMyDossiers(authentication);
        List<Map<String, Object>> out = dossiers.stream().map(d -> {
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id", d.getId());
            row.put("reference", d.getReference() != null ? d.getReference() : "");
            row.put("nomDebiteur", d.getNomDebiteur() != null ? d.getNomDebiteur() : "");
            row.put("statut", d.getStatut() != null ? d.getStatut().name() : "");
            return row;
        }).toList();
        return ResponseEntity.ok(out);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PRESTATAIRE_CREATE')")
    public ResponseEntity<PrestataireDto> create(@RequestBody PrestataireDto dto) {
        return ResponseEntity.ok(prestataireService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PRESTATAIRE_UPDATE')")
    public ResponseEntity<PrestataireDto> update(@PathVariable("id") Long id, @RequestBody PrestataireDto dto) {
        return ResponseEntity.ok(prestataireService.update(id, dto));
    }

    @GetMapping("/{id}/notes-honoraires")
    @PreAuthorize("hasAuthority('PRESTATAIRE_READ')")
    public ResponseEntity<List<NoteHonoraireDtos.NoteResponse>> listNotesHonoraires(@PathVariable("id") Long id) {
        return ResponseEntity.ok(noteHonoraireService.listByPrestataire(id));
    }

    @PostMapping("/{id}/notes-honoraires")
    @PreAuthorize("hasAnyAuthority('PRESTATAIRE_UPDATE','PRESTATAIRE_CREATE')")
    public ResponseEntity<NoteHonoraireDtos.NoteResponse> createNoteHonoraire(
            @PathVariable("id") Long id,
            @RequestBody NoteHonoraireDtos.CreateNoteRequest request
    ) {
        return ResponseEntity.ok(noteHonoraireService.create(null, new NoteHonoraireDtos.CreateNoteRequest(
                id, request.dossierId(), request.typeLien(), request.referenceLien(), request.montantHonoraires(), request.fraisAdministratifs(), request.fichierJustificatif()
        )));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PRESTATAIRE_DELETE')")
    public ResponseEntity<Void> deactivate(@PathVariable("id") Long id) {
        prestataireService.deactivate(id);
        return ResponseEntity.ok().build();
    }
}
