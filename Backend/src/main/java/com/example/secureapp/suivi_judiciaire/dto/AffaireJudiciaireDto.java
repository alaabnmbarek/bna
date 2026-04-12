package com.example.secureapp.suivi_judiciaire.dto;

import com.example.secureapp.suivi_judiciaire.AffaireStatus;
import com.example.secureapp.suivi_judiciaire.AssignationTarget;
import com.example.secureapp.suivi_judiciaire.ProcedureType;
import java.math.BigDecimal;
import java.time.LocalDate;

public record AffaireJudiciaireDto(
    Long id,
    Long dossierId,
    String dossierReference,
    String nomDebiteur,
    String referenceTribunal,
    ProcedureType typeProcedure,
    AssignationTarget assignationTarget,
    String garantiePatrimoine,
    BigDecimal montant,
    LocalDate dateTransmission,
    AffaireStatus statut,
    String tribunal,
    LocalDate dateOuverture,
    Long avocatId,
    String avocatNom,
    Long huissierId,
    String huissierNom,
    String observations
) {}
