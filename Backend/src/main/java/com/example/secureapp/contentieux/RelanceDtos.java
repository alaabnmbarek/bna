package com.example.secureapp.contentieux;

import java.time.LocalDate;

public class RelanceDtos {
    public record RelanceDto(
            Long id,
            LocalDate dateRelance,
            RelanceType typeRelance,
            RelanceStatut statut,
            String dossier
    ) {}

    public record RelanceRequest(
            LocalDate dateRelance,
            RelanceType typeRelance,
            RelanceStatut statut
    ) {}
}

