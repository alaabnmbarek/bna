package com.example.secureapp.facture;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/factures")
public class FactureController {

    private final FactureService factureService;

    public FactureController(FactureService factureService) {
        this.factureService = factureService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','CHARGE_DOSSIER','RESPONSABLE_CONTENTIEUX','PRESTATAIRE','AVOCAT','HUISSIER','EXPERT') or hasAnyAuthority('ROLE_ADMIN','ROLE_CHARGE_DOSSIER','ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<List<FactureDto>> getAllFactures(Authentication authentication) {
        System.out.println("[DEBUG] GET /api/factures appelé par user: " + (authentication != null ? authentication.getName() : "null"));
        if (factureService.isInternal(authentication)) {
            List<FactureDto> all = factureService.getAll();
            System.out.println("[DEBUG] Mode interne - Retourne " + all.size() + " factures");
            return ResponseEntity.ok(all);
        }
        List<FactureDto> mine = factureService.listMine(authentication);
        System.out.println("[DEBUG] Mode prestataire - Retourne " + mine.size() + " factures");
        return ResponseEntity.ok(mine);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CHARGE_DOSSIER','RESPONSABLE_CONTENTIEUX','PRESTATAIRE','AVOCAT','HUISSIER','EXPERT') or hasAnyAuthority('ROLE_ADMIN','ROLE_CHARGE_DOSSIER','ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<FactureDto> getFactureById(@PathVariable Long id, Authentication authentication) {
        FactureDto dto = factureService.getById(id);
        if (!factureService.isInternal(authentication)) {
            Long pid = factureService.currentPrestataireId(authentication);
            if (dto.getPrestataireId() == null || !dto.getPrestataireId().equals(pid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX') or hasAnyAuthority('ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<FactureDto> createFacture(@RequestBody FactureDto dto) {
        return ResponseEntity.ok(factureService.create(dto));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT') or hasAnyAuthority('ROLE_ADMIN')")
    public ResponseEntity<FactureImportResponse> importFacture(@RequestPart("file") MultipartFile file, Authentication authentication) {
        return ResponseEntity.ok(factureService.importFromFile(file, authentication));
    }

    @GetMapping("/{id}/file")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT') or hasAnyAuthority('ROLE_ADMIN')")
    public ResponseEntity<Resource> downloadFile(@PathVariable("id") Long id, Authentication authentication) {
        FactureDto dto = factureService.getById(id);
        if (!factureService.isInternal(authentication)) {
            Long pid = factureService.currentPrestataireId(authentication);
            if (dto.getPrestataireId() == null || !dto.getPrestataireId().equals(pid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        Resource res = factureService.loadFactureFile(id);
        String name = res.getFilename() != null ? res.getFilename() : "facture";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + name + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(res);
    }

    @PostMapping(value = "/{id}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX', 'PRESTATAIRE', 'AVOCAT', 'HUISSIER', 'EXPERT') or hasAnyAuthority('ROLE_ADMIN')")
    public ResponseEntity<FactureDto> uploadFile(@PathVariable("id") Long id, @RequestPart("file") MultipartFile file, Authentication authentication) {
        return ResponseEntity.ok(factureService.attachFile(id, file, authentication));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<FactureDto> updateFacture(@PathVariable Long id, @RequestBody FactureDto dto, Authentication authentication) {
        return ResponseEntity.ok(factureService.update(id, dto, authentication));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RESPONSABLE_CONTENTIEUX') or hasAnyAuthority('ADMIN', 'RESPONSABLE_CONTENTIEUX', 'ROLE_ADMIN', 'ROLE_RESPONSABLE_CONTENTIEUX')")
    public ResponseEntity<Void> deleteFacture(@PathVariable Long id) {
        factureService.delete(id);
        return ResponseEntity.ok().build();
    }
}
