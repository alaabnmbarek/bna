package com.example.secureapp.suivi_judiciaire.dto;

import com.example.secureapp.suivi_judiciaire.AffaireStatus;
import com.example.secureapp.suivi_judiciaire.ProcedureType;
import java.time.LocalDate;

public record AffaireJudiciaireDto(
    Long id,
    Long dossierId,
    String dossierReference,
    String nomDebiteur,
    String referenceTribunal,
    ProcedureType typeProcedure,
    AffaireStatus statut,
    String tribunal,
    LocalDate dateOuverture,
    Long avocatId,
    String avocatNom,
    Long huissierId,
    String huissierNom,
    String observations
) {}
