package com.example.secureapp.contentieux;

import com.example.secureapp.contentieux.dto.ContentieuxDtos;
import com.example.secureapp.contentieux.dto.ChargeDossierDtos;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
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
    private final UserRepository userRepository;

    public DossierContentieuxController(DossierContentieuxService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    @GetMapping("/charges-dossiers")
    @PreAuthorize("hasAuthority('CONTENTIOUS_READ')")
    public ResponseEntity<List<ChargeDossierDtos.ChargeOption>> listChargesDossiers(Authentication authentication) {
        List<UserEntity> users;
        if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CHARGE_DOSSIER"))) {
            users = userRepository.findByUsername(authentication.getName()).map(List::of).orElse(List.of());
        } else {
            users = userRepository.findByRole_NameAndEnabledTrueOrderByFullNameAsc("CHARGE_DOSSIER");
        }
        List<ChargeDossierDtos.ChargeOption> result = users.stream().map(u -> {
            String fullName = u.getFullName();
            String username = u.getUsername();
            String label = (fullName != null && !fullName.isBlank()) ? fullName : username;
            return new ChargeDossierDtos.ChargeOption(u.getId(), username, fullName, label);
        }).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CONTENTIOUS_READ')")
    public ResponseEntity<List<ContentieuxDtos.DossierResponse>> list(Authentication authentication) {
        return ResponseEntity.ok(service.list(authentication));
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
    public ResponseEntity<ContentieuxDtos.DossierResponse> update(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.CreateDossierRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.update(id, request, authentication));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAuthority('CONTENTIOUS_ASSIGN')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> assign(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.AssignRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.assign(id, request, authentication));
    }

    @PatchMapping("/{id}/change-account")
    @PreAuthorize("hasAuthority('CONTENTIOUS_CHANGE_ACCOUNT')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> changeAccount(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.ChangeAccountRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.changeAccount(id, request, authentication));
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAuthority('CONTENTIOUS_CLOSE')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> close(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.CloseRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.close(id, request, authentication));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('CONTENTIOUS_REJECT')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> reject(@PathVariable("id") Long id, @RequestBody ContentieuxDtos.RejectRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.reject(id, request, authentication));
    }

    @PatchMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('CONTENTIOUS_REOPEN')")
    public ResponseEntity<ContentieuxDtos.DossierResponse> reopen(@PathVariable("id") Long id, Authentication authentication) {
        return ResponseEntity.ok(service.reopen(id, authentication));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONTENTIOUS_DELETE')")
    public ResponseEntity<?> delete(@PathVariable("id") Long id, Authentication authentication) {
        service.delete(id, authentication);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
