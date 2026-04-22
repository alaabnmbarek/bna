package com.example.secureapp.prestataire.honoraire.dto;

import com.example.secureapp.facture.TypeLien;
import com.example.secureapp.prestataire.honoraire.NoteHonoraireStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class NoteHonoraireDtos {
    public record CreateNoteRequest(
            Long prestataireId,
            Long dossierId,
            TypeLien typeLien,
            String referenceLien,
            BigDecimal montantHonoraires,
            BigDecimal fraisAdministratifs,
            String fichierJustificatif
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
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
