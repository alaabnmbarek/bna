package com.example.secureapp.prestataire.honoraire.dto;

import com.example.secureapp.facture.TypeLien;
import com.example.secureapp.prestataire.honoraire.NoteHonoraireStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class NoteHonoraireDtos {
    public record NotePrestationDto(
            String type,
            String description,
            BigDecimal montant
    ) {}

    public record CreateNoteRequest(
            Long prestataireId,
            Long dossierId,
            TypeLien typeLien,
            String referenceLien,
            BigDecimal montantHonoraires,
            BigDecimal fraisAdministratifs,
            String fichierJustificatif,
            String remarques,
            LocalDateTime dateEmission,
            List<NotePrestationDto> prestations
    ) {}

    public record NoteResponse(
            Long id,
            String numero,
            Long prestataireId,
            String prestataireNom,
            Long dossierId,
            String dossierReference,
            String compteActuel,
            String agence,
            BigDecimal montantEngage,
            TypeLien typeLien,
            String referenceLien,
            BigDecimal montantHonoraires,
            BigDecimal fraisAdministratifs,
            BigDecimal tva,
            BigDecimal total,
            NoteHonoraireStatus statut,
            String fichierJustificatif,
            String remarques,
            LocalDateTime dateEmission,
            List<NotePrestationDto> prestations,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
