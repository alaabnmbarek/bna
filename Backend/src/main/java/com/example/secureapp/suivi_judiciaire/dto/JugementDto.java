package com.example.secureapp.suivi_judiciaire.dto;

import com.example.secureapp.suivi_judiciaire.DecisionType;
import java.math.BigDecimal;
import java.time.LocalDate;

public record JugementDto(
    Long id,
    Long affaireId,
    LocalDate dateJugement,
    DecisionType typeDecision,
    BigDecimal montantRecupere,
    String observations,
    String documentUrl
) {}
