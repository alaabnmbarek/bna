package com.example.secureapp.contentieux.affaire;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contentieux/dossiers/{dossierId}/affaires")
public class AffaireContentieuxController {
    private final AffaireContentieuxService service;

    public AffaireContentieuxController(AffaireContentieuxService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CONTENTIOUS_READ')")
    public ResponseEntity<List<AffaireDtos.AffaireResponse>> list(@PathVariable("dossierId") Long dossierId, Authentication authentication) {
        return ResponseEntity.ok(service.listByDossier(dossierId, authentication));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CONTENTIOUS_CREATE')")
    public ResponseEntity<AffaireDtos.AffaireResponse> create(@PathVariable("dossierId") Long dossierId, @RequestBody AffaireDtos.CreateAffaireRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.create(dossierId, request, authentication));
    }
}

