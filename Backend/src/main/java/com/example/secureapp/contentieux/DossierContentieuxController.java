package com.example.secureapp.contentieux;

import com.example.secureapp.contentieux.dto.ContentieuxDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contentieux/dossiers")
public class DossierContentieuxController {
    private final DossierContentieuxService service;

    public DossierContentieuxController(DossierContentieuxService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CONTENTIOUS_READ')")
    public ResponseEntity<List<ContentieuxDtos.DossierResponse>> list() {
        return ResponseEntity.ok(service.list());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CONTENTIOUS_CREATE')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> create(@RequestBody ContentieuxDtos.CreateDossierRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.create(request, authentication));
    }

    @PatchMapping("/{id}/validate")
    @PreAuthorize("hasAuthority('CONTENTIOUS_VALIDATE')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> validate(@PathVariable("id") Long id, Authentication authentication) {
        return ResponseEntity.ok(service.validate(id, authentication));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('CONTENTIOUS_UPDATE')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> update(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.CreateDossierRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAuthority('CONTENTIOUS_ASSIGN')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> assign(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.AssignRequest request) {
        return ResponseEntity.ok(service.assign(id, request));
    }

    @PatchMapping("/{id}/change-account")
    @PreAuthorize("hasAuthority('CONTENTIOUS_CHANGE_ACCOUNT')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> changeAccount(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.ChangeAccountRequest request) {
        return ResponseEntity.ok(service.changeAccount(id, request));
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAuthority('CONTENTIOUS_CLOSE')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> close(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.CloseRequest request) {
        return ResponseEntity.ok(service.close(id, request));
    }

    @PatchMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('CONTENTIOUS_REOPEN')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> reopen(@PathVariable("id") Long id) {
        return ResponseEntity.ok(service.reopen(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONTENTIOUS_DELETE')")
    public ResponseEntity<?> delete(@PathVariable("id") Long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
