package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.PrestataireDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prestataires")
public class PrestataireController {
    private final PrestataireService prestataireService;

    public PrestataireController(PrestataireService prestataireService) {
        this.prestataireService = prestataireService;
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PRESTATAIRE_DELETE')")
    public ResponseEntity<Void> deactivate(@PathVariable("id") Long id) {
        prestataireService.deactivate(id);
        return ResponseEntity.ok().build();
    }
}
