package com.example.secureapp.prestataire.honoraire.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class NoteHonoraireDtos {
    public record CreateNoteRequest(
            Long dossierId,
            BigDecimal montantHonoraires,
            BigDecimal fraisAdministratifs
    ) {}

    public record NoteResponse(
            Long id,
            Long prestataireId,
            Long dossierId,
            String dossierReference,
            String dossierObjet,
            String compteActuel,
            String agence,
            BigDecimal montantEngage,
            BigDecimal montantHonoraires,
            BigDecimal fraisAdministratifs,
            BigDecimal tva,
            BigDecimal total,
            LocalDateTime createdAt
    ) {}
}

