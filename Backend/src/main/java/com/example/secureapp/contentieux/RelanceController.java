package com.example.secureapp.contentieux;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dossiers/{dossierId}/relances")
public class RelanceController {
    private final RelanceService service;

    public RelanceController(RelanceService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CONTENTIOUS_READ')")
    public List<RelanceDtos.RelanceDto> list(@PathVariable("dossierId") Long dossierId, Authentication authentication) {
        return service.list(dossierId, authentication);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CONTENTIOUS_CREATE')")
    public ResponseEntity<RelanceDtos.RelanceDto> create(@PathVariable("dossierId") Long dossierId,
                                                         @RequestBody RelanceDtos.RelanceRequest req,
                                                         Authentication authentication) {
        return ResponseEntity.ok(service.create(dossierId, req, authentication));
    }

    @PutMapping("/{relanceId}")
    @PreAuthorize("hasAuthority('CONTENTIOUS_UPDATE')")
    public ResponseEntity<RelanceDtos.RelanceDto> update(@PathVariable("dossierId") Long dossierId,
                                                         @PathVariable("relanceId") Long relanceId,
                                                         @RequestBody RelanceDtos.RelanceRequest req,
                                                         Authentication authentication) {
        return ResponseEntity.ok(service.update(dossierId, relanceId, req, authentication));
    }
}

