package com.example.secureapp.risque;

import com.example.secureapp.risque.dto.RisqueDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contentieux/dossiers/{dossierId}/risque")
public class DossierRisqueController {
    private final RisqueItemService service;

    public DossierRisqueController(RisqueItemService service) {
        this.service = service;
    }

    @GetMapping("/{category}")
    @PreAuthorize("hasAuthority('CONTENTIOUS_READ')")
    public ResponseEntity<List<RisqueDtos.ItemResponse>> list(
            @PathVariable("dossierId") Long dossierId,
            @PathVariable("category") RisqueCategory category
    ) {
        return ResponseEntity.ok(service.listByDossierAndCategory(dossierId, category));
    }

    @PostMapping("/{category}")
    @PreAuthorize("hasAuthority('CONTENTIOUS_UPDATE')")
    public ResponseEntity<RisqueDtos.ItemResponse> create(
            @PathVariable("dossierId") Long dossierId,
            @PathVariable("category") RisqueCategory category,
            @RequestBody RisqueDtos.UpsertRequest request
    ) {
        return ResponseEntity.ok(service.create(dossierId, category, request));
    }

    @PutMapping("/{category}/{itemId}")
    @PreAuthorize("hasAuthority('CONTENTIOUS_UPDATE')")
    public ResponseEntity<RisqueDtos.ItemResponse> update(
            @PathVariable("dossierId") Long dossierId,
            @PathVariable("category") RisqueCategory category,
            @PathVariable("itemId") Long itemId,
            @RequestBody RisqueDtos.UpsertRequest request
    ) {
        return ResponseEntity.ok(service.update(dossierId, category, itemId, request));
    }

    @DeleteMapping("/{category}/{itemId}")
    @PreAuthorize("hasAuthority('CONTENTIOUS_UPDATE')")
    public ResponseEntity<?> delete(
            @PathVariable("dossierId") Long dossierId,
            @PathVariable("category") RisqueCategory category,
            @PathVariable("itemId") Long itemId
    ) {
        service.delete(dossierId, category, itemId);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}

