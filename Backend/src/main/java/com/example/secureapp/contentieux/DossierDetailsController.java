package com.example.secureapp.contentieux;

import com.example.secureapp.contentieux.affaire.AffaireContentieuxService;
import com.example.secureapp.contentieux.dto.DossierDetailsDtos;
import com.example.secureapp.prestataire.MissionEntity;
import com.example.secureapp.prestataire.MissionRepository;
import com.example.secureapp.prestataire.PrestataireEntity;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireEntity;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireRepository;
import com.example.secureapp.suivi_judiciaire.JugementRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dossiers")
public class DossierDetailsController {
    private final DossierContentieuxService dossierService;
    private final AffaireContentieuxService affaireContentieuxService;
    private final AffaireJudiciaireRepository affaireJudiciaireRepository;
    private final JugementRepository jugementRepository;
    private final MissionRepository missionRepository;

    public DossierDetailsController(
            DossierContentieuxService dossierService,
            AffaireContentieuxService affaireContentieuxService,
            AffaireJudiciaireRepository affaireJudiciaireRepository,
            JugementRepository jugementRepository,
            MissionRepository missionRepository
    ) {
        this.dossierService = dossierService;
        this.affaireContentieuxService = affaireContentieuxService;
        this.affaireJudiciaireRepository = affaireJudiciaireRepository;
        this.jugementRepository = jugementRepository;
        this.missionRepository = missionRepository;
    }

    @GetMapping("/{id}/details")
    @PreAuthorize("hasAuthority('CONTENTIOUS_READ')")
    @Transactional(readOnly = true)
    public ResponseEntity<DossierDetailsDtos.DossierDetailsResponse> getDetails(@PathVariable("id") Long id, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierService.getAccessibleEntity(id, authentication);

        DossierDetailsDtos.DossierInfo dossierInfo = new DossierDetailsDtos.DossierInfo(
                dossier.getId(),
                dossier.getReference(),
                dossier.getNomDebiteur(),
                dossier.getStatut(),
                dossier.getCreatedAt(),
                dossier.getCompteActuel(),
                dossier.getAgence(),
                dossier.getChargeDossier(),
                dossier.getMontantEngage(),
                dossier.getMontantRecupere()
        );

        var affaires = affaireContentieuxService.listByDossier(id, authentication);

        List<AffaireJudiciaireEntity> proceduresEntities = affaireJudiciaireRepository.findByDossierContentieuxId(id);
        List<DossierDetailsDtos.ProcedureInfo> procedures = new ArrayList<>();
        Map<Long, DossierDetailsDtos.PrestataireInfo> prestatairesById = new LinkedHashMap<>();

        for (AffaireJudiciaireEntity p : proceduresEntities) {
            var jugementOpt = jugementRepository.findByAffaireJudiciaireId(p.getId());
            var typeDecision = jugementOpt.map(j -> j.getTypeDecision()).orElse(null);
            var dateJugement = jugementOpt.map(j -> j.getDateJugement()).orElse(null);

            PrestataireEntity avocat = p.getAvocat();
            PrestataireEntity huissier = p.getHuissier();
            if (avocat != null) prestatairesById.put(avocat.getId(), toPrestataireInfo(avocat));
            if (huissier != null) prestatairesById.put(huissier.getId(), toPrestataireInfo(huissier));

            procedures.add(new DossierDetailsDtos.ProcedureInfo(
                    p.getId(),
                    dossier.getId(),
                    p.getReferenceTribunal(),
                    p.getTypeProcedure(),
                    p.getTribunal(),
                    p.getObservations(),
                    p.getStatut(),
                    p.getDateOuverture(),
                    avocat != null ? (avocat.getNom() + " " + (avocat.getPrenom() != null ? avocat.getPrenom() : "")).trim() : null,
                    huissier != null ? (huissier.getNom() + " " + (huissier.getPrenom() != null ? huissier.getPrenom() : "")).trim() : null,
                    typeDecision,
                    dateJugement
            ));
        }

        List<MissionEntity> missionEntities = dossier.getReference() != null
                ? missionRepository.findByDossierReferenceOrderByCreatedAtDesc(dossier.getReference())
                : List.of();
        List<DossierDetailsDtos.MissionInfo> missions = new ArrayList<>();
        for (MissionEntity m : missionEntities) {
            PrestataireEntity prest = m.getPrestataire();
            if (prest != null) prestatairesById.put(prest.getId(), toPrestataireInfo(prest));
            missions.add(new DossierDetailsDtos.MissionInfo(
                    m.getId(),
                    m.getTitre(),
                    m.getStatut(),
                    m.getDateDebut(),
                    m.getDateEcheance(),
                    m.getDateFin(),
                    prest != null ? prest.getId() : null,
                    prest != null ? (prest.getNom() + " " + (prest.getPrenom() != null ? prest.getPrenom() : "")).trim() : null
            ));
        }

        List<String> documents = List.of();

        return ResponseEntity.ok(new DossierDetailsDtos.DossierDetailsResponse(
                dossierInfo,
                affaires,
                procedures,
                missions,
                new ArrayList<>(prestatairesById.values()),
                documents
        ));
    }

    private DossierDetailsDtos.PrestataireInfo toPrestataireInfo(PrestataireEntity p) {
        return new DossierDetailsDtos.PrestataireInfo(
                p.getId(),
                p.getType(),
                p.getNom(),
                p.getPrenom(),
                p.getEmail(),
                p.getTelephone()
        );
    }
}
