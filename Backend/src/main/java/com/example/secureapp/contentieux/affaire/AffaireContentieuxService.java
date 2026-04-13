package com.example.secureapp.contentieux.affaire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AffaireContentieuxService {
    private final AffaireContentieuxRepository repository;
    private final DossierContentieuxService dossierService;

    public AffaireContentieuxService(AffaireContentieuxRepository repository, DossierContentieuxService dossierService) {
        this.repository = repository;
        this.dossierService = dossierService;
    }

    @Transactional(readOnly = true)
    public List<AffaireDtos.AffaireResponse> listByDossier(Long dossierId, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierService.getAccessibleEntity(dossierId, authentication);
        ensureGlobalNumeroAffaireUniqueness();
        backfillNumeroAffaireIfMissing(dossier.getId());
        return repository.findByDossierIdOrderByDateCreationDesc(dossier.getId()).stream()
                .map(a -> toResponse(a, dossier))
                .toList();
    }

    @Transactional
    public AffaireDtos.AffaireResponse create(Long dossierId, AffaireDtos.CreateAffaireRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierService.getAccessibleEntity(dossierId, authentication);
        if (request.typeAffaire() == null || request.typeAffaire().isBlank()) {
            throw new RuntimeException("Type d'affaire obligatoire");
        }
        if (request.statut() == null) {
            throw new RuntimeException("Statut obligatoire");
        }
        LocalDate dateCreation = request.dateCreation() != null ? request.dateCreation() : LocalDate.now();

        ensureGlobalNumeroAffaireUniqueness();

        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                AffaireContentieuxEntity entity = new AffaireContentieuxEntity();
                entity.setDossier(dossier);
                entity.setNumeroAffaire(resolveNumeroAffaire(request.numeroAffaire(), dateCreation, null));
                entity.setTypeAffaire(request.typeAffaire().trim());
                entity.setDescription(request.description());
                entity.setStatut(request.statut());
                entity.setDateCreation(dateCreation);
                AffaireContentieuxEntity saved = repository.save(entity);
                return toResponse(saved, dossier);
            } catch (DataIntegrityViolationException ex) {
                if (attempt == 2) throw ex;
            }
        }
        throw new RuntimeException("Erreur lors de la création de l'affaire");
    }

    private void backfillNumeroAffaireIfMissing(Long dossierId) {
        List<AffaireContentieuxEntity> missing = repository.findByDossierIdAndNumeroAffaireIsNullOrderByDateCreationAscIdAsc(dossierId);
        if (missing.isEmpty()) return;

        Map<Integer, Integer> nextByYear = new HashMap<>();
        for (AffaireContentieuxEntity a : missing) {
            LocalDate d = a.getDateCreation() != null ? a.getDateCreation() : LocalDate.now();
            int year = d.getYear();
            int next = nextByYear.computeIfAbsent(year, y -> currentMaxForYear(y) + 1);
            a.setNumeroAffaire(formatNumero(year, next));
            nextByYear.put(year, next + 1);
            repository.save(a);
        }
    }

    private void ensureGlobalNumeroAffaireUniqueness() {
        List<String> dup = repository.findDuplicateNumeroAffaireValues();
        if (dup.isEmpty()) return;

        List<AffaireContentieuxEntity> rows = repository.findByNumeroAffaireInOrderByIdAsc(dup);
        if (rows.isEmpty()) return;

        Set<String> seen = new HashSet<>();
        Map<Integer, Integer> nextByYear = new HashMap<>();
        for (AffaireContentieuxEntity a : rows) {
            String num = a.getNumeroAffaire();
            if (num == null || num.isBlank()) continue;
            if (seen.add(num)) continue;

            LocalDate d = a.getDateCreation() != null ? a.getDateCreation() : LocalDate.now();
            int year = d.getYear();
            int next = nextByYear.computeIfAbsent(year, y -> currentMaxForYear(y) + 1);
            a.setNumeroAffaire(formatNumero(year, next));
            nextByYear.put(year, next + 1);
            repository.save(a);
        }
    }

    private String resolveNumeroAffaire(String requested, LocalDate dateCreation, Integer providedSequence) {
        if (requested != null && !requested.isBlank()) return requested.trim();
        int year = (dateCreation != null ? dateCreation.getYear() : LocalDate.now().getYear());
        int next = providedSequence != null ? providedSequence : (currentMaxForYear(year) + 1);
        return formatNumero(year, next);
    }

    private int currentMaxForYear(int year) {
        String prefix = "AFF-" + year + "-";
        return repository.findTopByNumeroAffaireStartingWithOrderByNumeroAffaireDesc(prefix)
                .map(AffaireContentieuxEntity::getNumeroAffaire)
                .map(value -> {
                    String suffix = value.substring(prefix.length());
                    try {
                        return Integer.parseInt(suffix);
                    } catch (Exception e) {
                        return 0;
                    }
                })
                .orElse(0);
    }

    private String formatNumero(int year, int next) {
        return "AFF-" + year + "-" + String.format("%04d", next);
    }

    private AffaireDtos.AffaireResponse toResponse(AffaireContentieuxEntity a, DossierContentieuxEntity dossier) {
        return new AffaireDtos.AffaireResponse(
                a.getId(),
                dossier.getId(),
                dossier.getReference(),
                a.getNumeroAffaire(),
                a.getTypeAffaire(),
                a.getDescription(),
                a.getStatut(),
                a.getDateCreation()
        );
    }
}
