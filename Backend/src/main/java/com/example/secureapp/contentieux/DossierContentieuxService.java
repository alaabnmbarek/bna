package com.example.secureapp.contentieux;

import com.example.secureapp.contentieux.dto.ContentieuxDtos;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class DossierContentieuxService {
    private final DossierContentieuxRepository repository;
    private final UserRepository userRepository;

    public DossierContentieuxService(DossierContentieuxRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    public List<ContentieuxDtos.DossierResponse> list(Authentication authentication) {
        List<DossierContentieuxEntity> rows;
        if (isChargeDossier(authentication)) {
            rows = repository.findByDeletedFalseAndChargeDossierIdOrderByCreatedAtDesc(requireCurrentUserId(authentication));
        } else {
            rows = repository.findByDeletedFalseOrderByCreatedAtDesc();
        }
        return rows.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ContentieuxDtos.DossierResponse create(ContentieuxDtos.CreateDossierRequest request, Authentication authentication) {
        boolean canValidate = hasAnyRole(authentication, "ROLE_RESPONSABLE_CONTENTIEUX", "ROLE_ADMIN");
        DossierContentieuxEntity dossier = new DossierContentieuxEntity();
        dossier.setReference(nextReference());
        dossier.setStatut(canValidate ? ContentieuxStatus.OUVERT : ContentieuxStatus.A_VALIDER);
        dossier.setObjet(request.objet());
        dossier.setNomDebiteur(nonBlankOrDefault(request.nomDebiteur(), "—"));
        dossier.setCompteActuel(request.compteActuel());
        dossier.setAncienCompte(request.ancienCompte());
        dossier.setAgence(request.agence());
        applyChargeAssignmentFromRequest(dossier, request.chargeDossierId(), request.chargeDossier(), authentication);
        dossier.setDateOuverture(request.dateOuverture() != null ? request.dateOuverture() : LocalDate.now());
        dossier.setMontantEngage(nvl(request.montantEngage()));
        dossier.setMontantRecupere(nvl(request.montantRecupere()));
        dossier.setMontantHonoraires(nvl(request.montantHonoraires()));
        dossier.setFraisAdministratifs(nvl(request.fraisAdministratifs()));
        dossier.setObservationsAdministratives(request.observationsAdministratives());
        dossier.setObservationsFinancieres(request.observationsFinancieres());
        dossier.setCreatedBy(authentication.getName());
        dossier.setValidatedByCtx(canValidate);
        if (canValidate) {
            dossier.setValidatedBy(authentication.getName());
            dossier.setValidatedAt(LocalDateTime.now());
        }
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse validate(Long id, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        dossier.setStatut(ContentieuxStatus.OUVERT);
        dossier.setValidatedBy(authentication.getName());
        dossier.setValidatedAt(LocalDateTime.now());
        dossier.setValidatedByCtx(true);
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse update(Long id, ContentieuxDtos.CreateDossierRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        dossier.setObjet(request.objet());
        dossier.setNomDebiteur(request.nomDebiteur());
        dossier.setAgence(request.agence());
        dossier.setObservationsAdministratives(request.observationsAdministratives());
        dossier.setObservationsFinancieres(request.observationsFinancieres());
        dossier.setMontantHonoraires(nvl(request.montantHonoraires()));
        dossier.setFraisAdministratifs(nvl(request.fraisAdministratifs()));
        if (dossier.getStatut() != ContentieuxStatus.A_VALIDER) {
            dossier.setCompteActuel(request.compteActuel());
            dossier.setAncienCompte(request.ancienCompte());
            applyChargeAssignmentFromRequest(dossier, request.chargeDossierId(), request.chargeDossier(), authentication);
            if (request.dateOuverture() != null) dossier.setDateOuverture(request.dateOuverture());
            dossier.setMontantEngage(nvl(request.montantEngage()));
            dossier.setMontantRecupere(nvl(request.montantRecupere()));
        }
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse assign(Long id, ContentieuxDtos.AssignRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        if (dossier.getStatut() == ContentieuxStatus.A_VALIDER) {
            throw new RuntimeException("Validation requise");
        }
        applyChargeAssignmentFromRequest(dossier, request.chargeDossierId(), request.chargeDossier(), authentication);
        if ((dossier.getStatut() == ContentieuxStatus.OUVERT || dossier.getStatut() == ContentieuxStatus.REOUVERT)
                && dossier.getChargeDossierId() != null) {
            dossier.setStatut(ContentieuxStatus.AFFECTE);
        }
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse changeAccount(Long id, ContentieuxDtos.ChangeAccountRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        if (dossier.getStatut() == ContentieuxStatus.A_VALIDER) {
            throw new RuntimeException("Validation requise");
        }
        String value = request.nouveauCompte();
        if (value == null || value.isBlank()) {
            throw new RuntimeException("Nouveau compte obligatoire");
        }
        dossier.setAncienCompte(dossier.getCompteActuel());
        dossier.setCompteActuel(value);
        dossier.setStatut(ContentieuxStatus.CHANGEMENT_COMPTE);
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse close(Long id, ContentieuxDtos.CloseRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        if (dossier.getStatut() == ContentieuxStatus.A_VALIDER) {
            throw new RuntimeException("Validation requise");
        }
        dossier.setStatut(ContentieuxStatus.CLOTURE);
        dossier.setDateCloture(request.dateCloture() != null ? request.dateCloture() : LocalDate.now());
        dossier.setMotifCloture(request.motifCloture());
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse reopen(Long id, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        dossier.setStatut(ContentieuxStatus.REOUVERT);
        dossier.setDateCloture(null);
        dossier.setMotifCloture(null);
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public void delete(Long id, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        dossier.setDeleted(true);
        repository.save(dossier);
    }

    private ContentieuxDtos.DossierResponse toResponse(DossierContentieuxEntity d) {
        return new ContentieuxDtos.DossierResponse(
                d.getId(),
                d.getReference(),
                d.getStatut(),
                d.getObjet(),
                d.getNomDebiteur(),
                d.getCompteActuel(),
                d.getAncienCompte(),
                d.getAgence(),
                d.getChargeDossier(),
                d.getChargeDossierId(),
                d.getDateOuverture(),
                d.getMontantEngage(),
                d.getMontantRecupere(),
                d.getMontantHonoraires(),
                d.getFraisAdministratifs(),
                d.getObservationsAdministratives(),
                d.getObservationsFinancieres(),
                d.getDateCloture(),
                d.getMotifCloture(),
                d.getCreatedBy(),
                d.getValidatedBy(),
                d.getValidatedAt(),
                d.getCreatedAt(),
                d.getUpdatedAt()
        );
    }

    private String nextReference() {
        int year = LocalDate.now().getYear();
        String prefix = "CTX-" + year + "-";
        return repository.findTopByReferenceStartingWithOrderByReferenceDesc(prefix)
                .map(DossierContentieuxEntity::getReference)
                .map(ref -> {
                    String suffix = ref.substring(prefix.length());
                    int n;
                    try {
                        n = Integer.parseInt(suffix);
                    } catch (Exception e) {
                        n = 0;
                    }
                    return prefix + String.format("%03d", n + 1);
                })
                .orElse(prefix + "001");
    }

    private boolean hasAnyRole(Authentication authentication, String... roles) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        var set = authentication.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        for (String role : roles) {
            if (set.contains(role)) return true;
        }
        return false;
    }

    private boolean isChargeDossier(Authentication authentication) {
        return hasAnyRole(authentication, "ROLE_CHARGE_DOSSIER");
    }

    private Long requireCurrentUserId(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        return userRepository.findByUsername(username).map(UserEntity::getId).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    private DossierContentieuxEntity requireAccessibleDossier(Long id, Authentication authentication) {
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        if (dossier.isDeleted()) {
            throw new RuntimeException("Dossier non trouvé");
        }
        if (isChargeDossier(authentication)) {
            Long uid = requireCurrentUserId(authentication);
            if (dossier.getChargeDossierId() == null || !dossier.getChargeDossierId().equals(uid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        return dossier;
    }

    private void applyChargeAssignmentFromRequest(DossierContentieuxEntity dossier, Long chargeDossierId, String chargeDossier, Authentication authentication) {
        if (isChargeDossier(authentication)) {
            Long uid = requireCurrentUserId(authentication);
            UserEntity user = userRepository.findById(uid).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            dossier.setChargeDossierId(user.getId());
            dossier.setChargeDossier(resolveUserLabel(user));
            return;
        }

        if (chargeDossierId != null) {
            UserEntity user = userRepository.findById(chargeDossierId).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            dossier.setChargeDossierId(user.getId());
            dossier.setChargeDossier(resolveUserLabel(user));
            return;
        }

        if (chargeDossier == null || chargeDossier.isBlank() || "Non affecté".equalsIgnoreCase(chargeDossier)) {
            dossier.setChargeDossierId(null);
            dossier.setChargeDossier("Non affecté");
            return;
        }

        dossier.setChargeDossierId(null);
        dossier.setChargeDossier(chargeDossier);
    }

    private String resolveUserLabel(UserEntity user) {
        String fullName = user.getFullName();
        String username = user.getUsername();
        if (fullName != null && !fullName.isBlank()) return fullName;
        return username;
    }

    private BigDecimal nvl(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private String nonBlankOrDefault(String v, String def) {
        if (v == null) return def;
        String t = v.trim();
        return t.isEmpty() ? def : t;
    }
}
