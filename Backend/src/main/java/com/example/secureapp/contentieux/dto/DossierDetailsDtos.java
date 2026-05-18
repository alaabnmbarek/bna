package com.example.secureapp.contentieux.dto;

import com.example.secureapp.contentieux.ContentieuxStatus;
import com.example.secureapp.prestataire.MissionStatus;
import com.example.secureapp.prestataire.PrestataireType;
import com.example.secureapp.suivi_judiciaire.AffaireStatus;
import com.example.secureapp.suivi_judiciaire.DecisionType;
import com.example.secureapp.suivi_judiciaire.ProcedureType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class DossierDetailsDtos {
    public record DossierInfo(
            Long id,
            String reference,
            String nomDebiteur,
            ContentieuxStatus statut,
            LocalDateTime createdAt,
            String compteActuel,
            String agence,
            String chargeDossier,
            String motifRejet,
            BigDecimal montantEngage,
            BigDecimal montantRecupere,
            Boolean urgentPrediction,
            Double urgentProbability,
            String urgentSource,
            LocalDateTime urgentPredictedAt
    ) {}

    public record ProcedureInfo(
            Long id,
            Long dossierId,
            String referenceTribunal,
            ProcedureType typeProcedure,
            String tribunal,
            String description,
            AffaireStatus statut,
            LocalDate dateOuverture,
            String avocatNom,
            String huissierNom,
            DecisionType typeDecision,
            LocalDate dateJugement
    ) {}

    public record MissionInfo(
            Long id,
            String titre,
            MissionStatus statut,
            LocalDate dateDebut,
            LocalDate dateEcheance,
            LocalDate dateFin,
            Long prestataireId,
            String prestataireNom
    ) {}

    public record PrestataireInfo(
            Long id,
            PrestataireType type,
            String nom,
            String prenom,
            String email,
            String telephone
    ) {}

    public record DossierDetailsResponse(
            DossierInfo dossier,
            List<com.example.secureapp.contentieux.affaire.AffaireDtos.AffaireResponse> affaires,
            List<ProcedureInfo> procedures,
            List<MissionInfo> missions,
            List<PrestataireInfo> prestataires,
            List<String> documents
    ) {}
}
