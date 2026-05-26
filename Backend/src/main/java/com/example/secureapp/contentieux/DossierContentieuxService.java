package com.example.secureapp.contentieux;

import com.example.secureapp.contentieux.dto.ContentieuxDtos;
import com.example.secureapp.contentieux.affaire.AffaireContentieuxEntity;
import com.example.secureapp.contentieux.affaire.AffaireContentieuxRepository;
import com.example.secureapp.notification.NotificationPriority;
import com.example.secureapp.notification.NotificationService;
import com.example.secureapp.notification.NotificationType;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireEntity;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireRepository;
import com.example.secureapp.suivi_judiciaire.AudienceEntity;
import com.example.secureapp.suivi_judiciaire.AudienceRepository;
import com.example.secureapp.suivi_judiciaire.AudienceStatus;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class DossierContentieuxService {
    private final DossierContentieuxRepository repository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final RelanceRepository relanceRepository;
    private final AffaireContentieuxRepository affaireRepository;
    private final AffaireJudiciaireRepository affaireJudiciaireRepository;
    private final AudienceRepository audienceRepository;
    private final boolean mlUrgencyEnabled;
    private final String mlUrgencyBaseUrl;
    private final int mlUrgencyTimeoutMs;

    public DossierContentieuxService(
            DossierContentieuxRepository repository,
            UserRepository userRepository,
            NotificationService notificationService,
            RelanceRepository relanceRepository,
            AffaireContentieuxRepository affaireRepository,
            AffaireJudiciaireRepository affaireJudiciaireRepository,
            AudienceRepository audienceRepository,
            @Value("${ml.urgency.enabled:false}") boolean mlUrgencyEnabled,
            @Value("${ml.urgency.base-url:}") String mlUrgencyBaseUrl,
            @Value("${ml.urgency.timeout-ms:3000}") int mlUrgencyTimeoutMs
    ) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.relanceRepository = relanceRepository;
        this.affaireRepository = affaireRepository;
        this.affaireJudiciaireRepository = affaireJudiciaireRepository;
        this.audienceRepository = audienceRepository;
        this.mlUrgencyEnabled = mlUrgencyEnabled;
        this.mlUrgencyBaseUrl = mlUrgencyBaseUrl;
        this.mlUrgencyTimeoutMs = mlUrgencyTimeoutMs;
    }

    @Transactional(readOnly = true)
    public List<ContentieuxDtos.DossierResponse> list(Authentication authentication) {
        List<DossierContentieuxEntity> rows;
        if (isChargeDossier(authentication)) {
            UserEntity user = requireCurrentUser(authentication);
            rows = repository.findAccessibleForCharge(user.getId(), resolveUserLabel(user));
        } else {
            rows = repository.findByDeletedFalseOrderByCreatedAtDesc();
        }

        Map<Long, String> labelsById = new HashMap<>();
        List<Long> ids = rows.stream()
                .map(DossierContentieuxEntity::getChargeDossierId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (!ids.isEmpty()) {
            userRepository.findAllById(ids).forEach(u -> labelsById.put(u.getId(), resolveUserLabel(u)));
        }

        return rows.stream()
                .map(d -> toResponse(d, labelsById))
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
        DossierContentieuxEntity saved = repository.save(dossier);
        applyAndPersistUrgencePrediction(saved);
        saved = repository.save(saved);
        if (saved.getChargeDossierId() != null) {
            notificationService.notifyUser(
                    saved.getChargeDossierId(),
                    "Un dossier vous a été affecté : " + saved.getReference(),
                    NotificationType.INFO,
                    NotificationPriority.NORMAL,
                    "DOSSIER",
                    saved.getId()
            );
        }
        return toResponse(saved);
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

    @Transactional(readOnly = true)
    public ContentieuxDtos.UrgencePredictionResponse predictUrgence(Long id, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        Map<String, Object> features = buildUrgenceFeatures(dossier);
        return callUrgenceModel(features);
    }

    @Transactional
    public ContentieuxDtos.UrgencePredictionResponse refreshUrgencePrediction(Long id, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        ContentieuxDtos.UrgencePredictionResponse pred = callUrgenceModel(buildUrgenceFeatures(dossier));
        dossier.setUrgentSource(pred.source());
        dossier.setUrgentPredictedAt(LocalDateTime.now());
        if ("ML".equals(pred.source())) {
            dossier.setUrgentPrediction(pred.urgent());
            dossier.setUrgentProbability(pred.probability());
        } else {
            dossier.setUrgentPrediction(null);
            dossier.setUrgentProbability(null);
        }
        repository.save(dossier);
        return pred;
    }

    @Transactional(readOnly = true)
    public ContentieuxDtos.UrgencePredictionResponse predictUrgenceFromFeatures(ContentieuxDtos.UrgencePredictionRequest request, Authentication authentication) {
        if (request == null) {
            return new ContentieuxDtos.UrgencePredictionResponse(false, null, "BAD_REQUEST");
        }
        Map<String, Object> features = new HashMap<>();
        long r = request.retardJours();
        long nr = request.nbRelances();
        if (r < 0) r = 0;
        if (nr < 0) nr = 0;
        features.put("retard_jours", r);
        features.put("montant", request.montant() != null ? request.montant() : BigDecimal.ZERO);
        features.put("nb_relances", nr);
        return callUrgenceModel(features);
    }

    private ContentieuxDtos.UrgencePredictionResponse callUrgenceModel(Map<String, Object> features) {
        if (!mlUrgencyEnabled) return new ContentieuxDtos.UrgencePredictionResponse(false, null, "DISABLED");
        if (mlUrgencyBaseUrl == null || mlUrgencyBaseUrl.isBlank()) return new ContentieuxDtos.UrgencePredictionResponse(false, null, "NO_BASE_URL");

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = Map.of("features", features);

            RestTemplate rest = restTemplate(mlUrgencyTimeoutMs);
            String url = mlUrgencyBaseUrl.endsWith("/") ? mlUrgencyBaseUrl.substring(0, mlUrgencyBaseUrl.length() - 1) : mlUrgencyBaseUrl;
            ResponseEntity<MlUrgencePredictResponse> resp = rest.exchange(
                    url + "/predict",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    MlUrgencePredictResponse.class
            );
            MlUrgencePredictResponse out = resp.getBody();
            if (out == null) return new ContentieuxDtos.UrgencePredictionResponse(false, null, "ML_EMPTY");
            return new ContentieuxDtos.UrgencePredictionResponse(Boolean.TRUE.equals(out.urgent), out.probability, "ML");
        } catch (Exception e) {
            return new ContentieuxDtos.UrgencePredictionResponse(false, null, "ML_ERROR");
        }
    }

    private Map<String, Object> buildUrgenceFeatures(DossierContentieuxEntity d) {
        Map<String, Object> m = new HashMap<>();
        long retardJours = 0;
        if (d.getDateOuverture() != null) {
            retardJours = ChronoUnit.DAYS.between(d.getDateOuverture(), LocalDate.now());
            if (retardJours < 0) retardJours = 0;
        }

        long nbRelances = 0;
        if (d.getId() != null) {
            nbRelances = relanceRepository.countByDossierId(d.getId());
        }

        m.put("retard_jours", retardJours);
        m.put("montant", d.getMontantEngage() != null ? d.getMontantEngage() : BigDecimal.ZERO);
        m.put("nb_relances", nbRelances);

        if (d.getId() != null) {
            List<AffaireContentieuxEntity> affaires = affaireRepository.findByDossierIdOrderByDateCreationDesc(d.getId());
            if (!affaires.isEmpty()) {
                String typeAffaire = affaires.get(0).getTypeAffaire();
                if (typeAffaire != null && !typeAffaire.isBlank()) {
                    m.put("type_affaire", typeAffaire.trim());
                }
            }
        }

        long nombreAudiences = 0;
        long nombreReports = 0;
        long experienceAvocat = 0;

        if (d.getId() != null) {
            List<AffaireJudiciaireEntity> affairesJud = affaireJudiciaireRepository.findByDossierContentieuxId(d.getId());
            for (AffaireJudiciaireEntity a : affairesJud) {
                if (a == null || a.getId() == null) continue;

                if (experienceAvocat == 0 && a.getAvocat() != null && a.getAvocat().getCreatedAt() != null) {
                    experienceAvocat = ChronoUnit.YEARS.between(a.getAvocat().getCreatedAt().toLocalDate(), LocalDate.now());
                    if (experienceAvocat < 0) experienceAvocat = 0;
                }

                List<AudienceEntity> auds = audienceRepository.findByAffaireJudiciaireIdOrderByDateAudienceAsc(a.getId());
                nombreAudiences += auds.size();
                nombreReports += auds.stream().filter(x -> x != null && x.getStatut() == AudienceStatus.REPORTEE).count();
            }
        }

        m.put("experience_avocat", experienceAvocat);
        m.put("nombre_audiences", nombreAudiences);
        m.put("nombre_reports", nombreReports);
        return m;
    }

    private RestTemplate restTemplate(int timeoutMs) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(timeoutMs);
        f.setReadTimeout(timeoutMs);
        return new RestTemplate(f);
    }

    private static class MlUrgencePredictResponse {
        public Boolean urgent;
        public Double probability;
        public Double threshold;
        public String model;
    }

    @Transactional
    public ContentieuxDtos.DossierResponse update(Long id, ContentieuxDtos.CreateDossierRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        Long oldChargeId = dossier.getChargeDossierId();
        dossier.setObjet(request.objet());
        dossier.setNomDebiteur(request.nomDebiteur());
        dossier.setAgence(request.agence());
        dossier.setObservationsAdministratives(request.observationsAdministratives());
        dossier.setObservationsFinancieres(request.observationsFinancieres());
        if (request.montantHonoraires() != null) dossier.setMontantHonoraires(nvl(request.montantHonoraires()));
        if (request.fraisAdministratifs() != null) dossier.setFraisAdministratifs(nvl(request.fraisAdministratifs()));
        if (request.montantEngage() != null) dossier.setMontantEngage(nvl(request.montantEngage()));
        if (request.montantRecupere() != null) dossier.setMontantRecupere(nvl(request.montantRecupere()));
        if (dossier.getStatut() != ContentieuxStatus.A_VALIDER) {
            dossier.setCompteActuel(request.compteActuel());
            dossier.setAncienCompte(request.ancienCompte());
            applyChargeAssignmentFromRequest(dossier, request.chargeDossierId(), request.chargeDossier(), authentication);
            if (request.dateOuverture() != null) dossier.setDateOuverture(request.dateOuverture());
        }
        DossierContentieuxEntity saved = repository.save(dossier);
        applyAndPersistUrgencePrediction(saved);
        saved = repository.save(saved);
        if (saved.getChargeDossierId() != null && !Objects.equals(oldChargeId, saved.getChargeDossierId())) {
            notificationService.notifyUser(
                    saved.getChargeDossierId(),
                    "Un dossier vous a été affecté : " + saved.getReference(),
                    NotificationType.INFO,
                    NotificationPriority.NORMAL,
                    "DOSSIER",
                    saved.getId()
            );
        }
        return toResponse(saved);
    }

    private void applyAndPersistUrgencePrediction(DossierContentieuxEntity dossier) {
        ContentieuxDtos.UrgencePredictionResponse pred = callUrgenceModel(buildUrgenceFeatures(dossier));
        dossier.setUrgentSource(pred.source());
        dossier.setUrgentPredictedAt(LocalDateTime.now());
        if ("ML".equals(pred.source())) {
            dossier.setUrgentPrediction(pred.urgent());
            dossier.setUrgentProbability(pred.probability());
        } else {
            dossier.setUrgentPrediction(null);
            dossier.setUrgentProbability(null);
        }
    }

    @Transactional
    public ContentieuxDtos.DossierResponse assign(Long id, ContentieuxDtos.AssignRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        Long oldChargeId = dossier.getChargeDossierId();
        if (dossier.getStatut() == ContentieuxStatus.A_VALIDER) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Validation requise");
        }
        applyChargeAssignmentFromRequest(dossier, request.chargeDossierId(), request.chargeDossier(), authentication);
        if ((dossier.getStatut() == ContentieuxStatus.OUVERT || dossier.getStatut() == ContentieuxStatus.REOUVERT)
                && dossier.getChargeDossierId() != null) {
            dossier.setStatut(ContentieuxStatus.AFFECTE);
        }
        DossierContentieuxEntity saved = repository.save(dossier);
        if (saved.getChargeDossierId() != null && !Objects.equals(oldChargeId, saved.getChargeDossierId())) {
            notificationService.notifyUser(
                    saved.getChargeDossierId(),
                    "Un dossier vous a été affecté : " + saved.getReference(),
                    NotificationType.INFO,
                    NotificationPriority.NORMAL,
                    "DOSSIER",
                    saved.getId()
            );
        }
        return toResponse(saved);
    }

    @Transactional
    public ContentieuxDtos.DossierResponse changeAccount(Long id, ContentieuxDtos.ChangeAccountRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        if (dossier.getStatut() == ContentieuxStatus.A_VALIDER) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Validation requise");
        }
        String value = request.nouveauCompte();
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Nouveau compte obligatoire");
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
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Validation requise");
        }
        dossier.setStatut(ContentieuxStatus.CLOTURE);
        dossier.setDateCloture(request.dateCloture() != null ? request.dateCloture() : LocalDate.now());
        dossier.setMotifCloture(request.motifCloture());
        return toResponse(repository.save(dossier));
    }

    @Transactional
    public ContentieuxDtos.DossierResponse reject(Long id, ContentieuxDtos.RejectRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireAccessibleDossier(id, authentication);
        String motif = request != null ? request.motifRejet() : null;
        if (motif == null || motif.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Motif de rejet obligatoire");
        }
        if (dossier.getStatut() != ContentieuxStatus.A_VALIDER) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Rejet possible uniquement pour les dossiers en attente de validation");
        }
        dossier.setStatut(ContentieuxStatus.REJETE);
        dossier.setMotifRejet(motif.trim());
        dossier.setRejectedBy(authentication.getName());
        dossier.setRejectedAt(LocalDateTime.now());
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

    @Transactional(readOnly = true)
    public DossierContentieuxEntity getAccessibleEntity(Long id, Authentication authentication) {
        return requireAccessibleDossier(id, authentication);
    }

    private ContentieuxDtos.DossierResponse toResponse(DossierContentieuxEntity d) {
        String chargeLabel = d.getChargeDossier();
        if (d.getChargeDossierId() != null) {
            chargeLabel = userRepository.findById(d.getChargeDossierId())
                    .map(this::resolveUserLabel)
                    .orElse(chargeLabel);
        }
        return new ContentieuxDtos.DossierResponse(
                d.getId(),
                d.getReference(),
                d.getStatut(),
                d.getObjet(),
                d.getNomDebiteur(),
                d.getCompteActuel(),
                d.getAncienCompte(),
                d.getAgence(),
                chargeLabel,
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
                d.getMotifRejet(),
                d.getRejectedBy(),
                d.getRejectedAt(),
                d.getCreatedBy(),
                d.getValidatedBy(),
                d.getValidatedAt(),
                d.getCreatedAt(),
                d.getUpdatedAt(),
                d.getUrgentPrediction(),
                d.getUrgentProbability(),
                d.getUrgentSource(),
                d.getUrgentPredictedAt()
        );
    }

    private ContentieuxDtos.DossierResponse toResponse(DossierContentieuxEntity d, Map<Long, String> labelsById) {
        String chargeLabel = d.getChargeDossier();
        if (d.getChargeDossierId() != null) {
            String resolved = labelsById.get(d.getChargeDossierId());
            if (resolved != null && !resolved.isBlank()) {
                chargeLabel = resolved;
            }
        }
        return new ContentieuxDtos.DossierResponse(
                d.getId(),
                d.getReference(),
                d.getStatut(),
                d.getObjet(),
                d.getNomDebiteur(),
                d.getCompteActuel(),
                d.getAncienCompte(),
                d.getAgence(),
                chargeLabel,
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
                d.getMotifRejet(),
                d.getRejectedBy(),
                d.getRejectedAt(),
                d.getCreatedBy(),
                d.getValidatedBy(),
                d.getValidatedAt(),
                d.getCreatedAt(),
                d.getUpdatedAt(),
                d.getUrgentPrediction(),
                d.getUrgentProbability(),
                d.getUrgentSource(),
                d.getUrgentPredictedAt()
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
        return requireCurrentUser(authentication).getId();
    }

    private UserEntity requireCurrentUser(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        return userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    private DossierContentieuxEntity requireAccessibleDossier(Long id, Authentication authentication) {
        DossierContentieuxEntity dossier = repository.findById(id).orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Dossier non trouvé"));
        if (dossier.isDeleted()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Dossier non trouvé");
        }
        if (isChargeDossier(authentication)) {
            UserEntity user = requireCurrentUser(authentication);
            Long uid = user.getId();

            if (dossier.getChargeDossierId() != null) {
                if (!dossier.getChargeDossierId().equals(uid)) {
                    throw new AccessDeniedException("Accès refusé");
                }
            } else {
                String label = resolveUserLabel(user);
                String dossierCharge = dossier.getChargeDossier();
                if (dossierCharge == null || dossierCharge.isBlank() || !dossierCharge.equalsIgnoreCase(label)) {
                    throw new AccessDeniedException("Accès refusé");
                }
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
