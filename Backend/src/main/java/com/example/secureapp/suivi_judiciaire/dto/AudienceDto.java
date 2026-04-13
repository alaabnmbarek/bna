package com.example.secureapp.suivi_judiciaire.dto;

import com.example.secureapp.suivi_judiciaire.AudienceStatus;
import java.time.LocalDateTime;

public record AudienceDto(
    Long id,
    Long affaireId,
    String referenceTribunal,
    LocalDateTime dateAudience,
    String referenceAudience,
    String tribunal,
    String salle,
    String objet,
    String compteRendu,
    AudienceStatus statut
) {}
