package com.example.secureapp.contentieux;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RelanceService {
    private final RelanceRepository repo;
    private final DossierContentieuxService dossierService;

    public RelanceService(RelanceRepository repo, DossierContentieuxService dossierService) {
        this.repo = repo;
        this.dossierService = dossierService;
    }

    public List<RelanceDtos.RelanceDto> list(Long dossierId, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierService.getAccessibleEntity(dossierId, authentication);
        return repo.findByDossierIdOrderByDateRelanceDesc(dossier.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    public RelanceDtos.RelanceDto create(Long dossierId, RelanceDtos.RelanceRequest req, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierService.getAccessibleEntity(dossierId, authentication);
        validate(req);

        RelanceEntity e = new RelanceEntity();
        e.setDossier(dossier);
        e.setDateRelance(req.dateRelance());
        e.setTypeRelance(req.typeRelance());
        e.setStatut(req.statut());
        e = repo.save(e);
        return toDto(e);
    }

    public RelanceDtos.RelanceDto update(Long dossierId, Long relanceId, RelanceDtos.RelanceRequest req, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierService.getAccessibleEntity(dossierId, authentication);
        validate(req);

        RelanceEntity e = repo.findById(relanceId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Relance introuvable"));
        if (e.getDossier() == null || e.getDossier().getId() == null || !e.getDossier().getId().equals(dossier.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Relance introuvable");
        }
        e.setDateRelance(req.dateRelance());
        e.setTypeRelance(req.typeRelance());
        e.setStatut(req.statut());
        e = repo.save(e);
        return toDto(e);
    }

    private void validate(RelanceDtos.RelanceRequest req) {
        if (req == null || req.dateRelance() == null || req.typeRelance() == null || req.statut() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Champs requis: dateRelance, typeRelance, statut");
        }
    }

    private RelanceDtos.RelanceDto toDto(RelanceEntity e) {
        String ref = null;
        if (e.getDossier() != null) {
            ref = e.getDossier().getReference();
        }
        return new RelanceDtos.RelanceDto(e.getId(), e.getDateRelance(), e.getTypeRelance(), e.getStatut(), ref);
    }
}

