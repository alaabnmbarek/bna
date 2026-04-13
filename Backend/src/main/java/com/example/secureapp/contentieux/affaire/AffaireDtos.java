package com.example.secureapp.contentieux.affaire;

import java.time.LocalDate;

public class AffaireDtos {
    public record CreateAffaireRequest(
            String numeroAffaire,
            String typeAffaire,
            String description,
            AffaireStatut statut,
            LocalDate dateCreation
    ) {}

    public record AffaireResponse(
            Long id,
            Long dossierId,
            String dossierReference,
            String numeroAffaire,
            String typeAffaire,
            String description,
            AffaireStatut statut,
            LocalDate dateCreation
    ) {}
}
