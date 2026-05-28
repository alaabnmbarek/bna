package com.example.secureapp.suivi_judiciaire.dto;

import com.example.secureapp.suivi_judiciaire.AffaireStatus;
import com.example.secureapp.suivi_judiciaire.AssignationTarget;
import com.example.secureapp.suivi_judiciaire.DecisionType;
import com.example.secureapp.suivi_judiciaire.ProcedureType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AffaireJudiciaireDto(
    Long id,
    Long dossierId,
    String dossierReference,
    String nomDebiteur,
    String referenceTribunal,
    String titre,
    ProcedureType typeProcedure,
    AssignationTarget assignationTarget,
    String garantiePatrimoine,
    BigDecimal montant,
    LocalDate dateTransmission,
    AffaireStatus statut,
    String tribunal,
    LocalDate dateOuverture,
    LocalDate dateAudience,
    Long avocatId,
    String avocatNom,
    Long huissierId,
    String huissierNom,
    String observations,
    DecisionType resultatDecision,
    LocalDateTime createdAt
) {}
