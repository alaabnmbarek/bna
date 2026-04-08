package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.PrestataireDto;
import com.example.secureapp.prestataire.honoraire.NoteHonoraireService;
import com.example.secureapp.prestataire.honoraire.dto.NoteHonoraireDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return ResponseEntity.ok(noteHonoraireService.create(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PRESTATAIRE_DELETE')")
    public ResponseEntity<Void> deactivate(@PathVariable("id") Long id) {
        prestataireService.deactivate(id);
        return ResponseEntity.ok().build();
    }
}
