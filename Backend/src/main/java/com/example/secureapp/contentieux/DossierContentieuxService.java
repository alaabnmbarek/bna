package com.example.secureapp.contentieux;

import com.example.secureapp.contentieux.dto.ContentieuxDtos;
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

    public DossierContentieuxService(DossierContentieuxRepository repository) {
        this.repository = repository;
    }

    public List<ContentieuxDtos.DossierResponse> list() {
        return repository.findByDeletedFalseOrderByCreatedAtDesc().stream()
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
        dossier.setChargeDossier(request.chargeDossier());
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
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        dossier.setStatut(ContentieuxStatus.OUVERT);
        dossier.setValidatedBy(authentication.getName());
        dossier.setValidatedAt(LocalDateTime.now());
        dossier.setValidatedByCtx(true);
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse update(Long id, ContentieuxDtos.CreateDossierRequest request) {
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
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
            dossier.setChargeDossier(request.chargeDossier());
            if (request.dateOuverture() != null) dossier.setDateOuverture(request.dateOuverture());
            dossier.setMontantEngage(nvl(request.montantEngage()));
            dossier.setMontantRecupere(nvl(request.montantRecupere()));
        }
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse assign(Long id, ContentieuxDtos.AssignRequest request) {
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        if (dossier.getStatut() == ContentieuxStatus.A_VALIDER) {
            throw new RuntimeException("Validation requise");
        }
        dossier.setChargeDossier(request.chargeDossier());
        if ((dossier.getStatut() == ContentieuxStatus.OUVERT || dossier.getStatut() == ContentieuxStatus.REOUVERT)
                && request.chargeDossier() != null
                && !request.chargeDossier().isBlank()
                && !"Non affecté".equalsIgnoreCase(request.chargeDossier())) {
            dossier.setStatut(ContentieuxStatus.AFFECTE);
        }
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse changeAccount(Long id, ContentieuxDtos.ChangeAccountRequest request) {
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
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
    public ContentieuxDtos.DossierResponse close(Long id, ContentieuxDtos.CloseRequest request) {
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        if (dossier.getStatut() == ContentieuxStatus.A_VALIDER) {
            throw new RuntimeException("Validation requise");
        }
        dossier.setStatut(ContentieuxStatus.CLOTURE);
        dossier.setDateCloture(request.dateCloture() != null ? request.dateCloture() : LocalDate.now());
        dossier.setMotifCloture(request.motifCloture());
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse reopen(Long id) {
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        dossier.setStatut(ContentieuxStatus.REOUVERT);
        dossier.setDateCloture(null);
        dossier.setMotifCloture(null);
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public void delete(Long id) {
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
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

    private BigDecimal nvl(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private String nonBlankOrDefault(String v, String def) {
        if (v == null) return def;
        String t = v.trim();
        return t.isEmpty() ? def : t;
    }
}
