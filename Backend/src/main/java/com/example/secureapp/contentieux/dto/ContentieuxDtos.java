package com.example.secureapp.contentieux.dto;

import com.example.secureapp.contentieux.ContentieuxStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ContentieuxDtos {
    public record CreateDossierRequest(
            String objet,
            String nomDebiteur,
            String compteActuel,
            String ancienCompte,
            String agence,
            String chargeDossier,
            LocalDate dateOuverture,
            BigDecimal montantEngage,
            BigDecimal montantRecupere,
            String observationsAdministratives,
            String observationsFinancieres
    ) {}

    public record AssignRequest(String chargeDossier) {}
    public record ChangeAccountRequest(String nouveauCompte) {}
    public record CloseRequest(LocalDate dateCloture, String motifCloture) {}

    public record DossierResponse(
            Long id,
            String reference,
            ContentieuxStatus statut,
            String objet,
            String nomDebiteur,
            String compteActuel,
            String ancienCompte,
            String agence,
            String chargeDossier,
            LocalDate dateOuverture,
            BigDecimal montantEngage,
            BigDecimal montantRecupere,
            String observationsAdministratives,
            String observationsFinancieres,
            LocalDate dateCloture,
            String motifCloture,
            String createdBy,
            String validatedBy,
            LocalDateTime validatedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}

