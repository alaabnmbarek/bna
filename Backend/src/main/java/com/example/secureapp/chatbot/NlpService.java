package com.example.secureapp.chatbot;

import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class NlpService {

    public NlpResult parse(String message) {
        String m = normalize(message);
        if (m.isBlank()) return new NlpResult(NlpResult.Entity.UNKNOWN, NlpResult.Action.UNKNOWN, NlpResult.Status.ANY);

        NlpResult.Action action = containsAny(m, "affiche", "afficher", "liste", "lister", "voir", "consulter")
                ? NlpResult.Action.GET_ALL
                : NlpResult.Action.GET_ALL;

        NlpResult.Entity entity;
        if (containsAny(m, "facture", "factures")) entity = NlpResult.Entity.FACTURE;
        else if (containsAny(m, "dossier", "dossiers", "contentieux")) entity = NlpResult.Entity.DOSSIER;
        else if (containsAny(m, "mission", "missions")) entity = NlpResult.Entity.MISSION;
        else entity = NlpResult.Entity.UNKNOWN;

        NlpResult.Status status = NlpResult.Status.ANY;
        if (containsAny(m, "refusee", "refusees", "refuse", "refus", "refusée", "refusées", "refusé", "refusés")) status = NlpResult.Status.REFUSED;
        else if (containsAny(m, "payee", "payees", "payé", "payés", "payée", "payées")) status = NlpResult.Status.PAID;
        else if (containsAny(m, "validee", "validees", "validée", "validées", "validé", "validés")) status = NlpResult.Status.VALIDATED;
        else if (containsAny(m, "a valider", "à valider", "validation", "en attente validation", "en attente de validation", "attente validation", "attente de validation")) status = NlpResult.Status.TO_VALIDATE;
        else if (containsAny(m, "en attente", "attente", "pending")) status = NlpResult.Status.PENDING;
        else if (containsAny(m, "assignee", "assignees", "assignée", "assignées", "assigné", "assignés", "assigne", "assigner")) status = NlpResult.Status.ASSIGNED;
        else if (containsAny(m, "en cours", "en traitement", "progress", "in progress")) {
            status = entity == NlpResult.Entity.DOSSIER ? NlpResult.Status.OPEN : NlpResult.Status.IN_PROGRESS;
        }
        else if (containsAny(m, "terminee", "terminees", "terminée", "terminées", "terminé", "terminés", "done", "finalisee", "finalisées")) status = NlpResult.Status.DONE;
        else if (containsAny(m, "annulee", "annulees", "annulée", "annulées", "annulé", "annulés", "cancelled", "cancel")) status = NlpResult.Status.CANCELLED;
        else if (containsAny(m, "echouee", "echouees", "échouée", "échouées", "échoué", "échoués", "failed", "echec", "échec")) status = NlpResult.Status.FAILED;
        else if (containsAny(m, "ouverte", "ouvertes", "ouvert", "ouverts", "open")) status = NlpResult.Status.OPEN;
        else if (containsAny(m, "fermee", "fermees", "ferme", "fermes", "fermée", "fermées", "fermé", "fermés", "cloture", "clotures", "clôturé", "clôturés", "clôturée", "clôturées")) status = NlpResult.Status.CLOSED;
        else if (containsAny(m, "en retard", "retard", "late")) status = NlpResult.Status.LATE;

        return new NlpResult(entity, action, status);
    }

    private String normalize(String v) {
        if (v == null) return "";
        String s = v.toLowerCase(Locale.ROOT).trim();
        s = s.replace("’", "'")
                .replace("é", "e")
                .replace("è", "e")
                .replace("ê", "e")
                .replace("à", "a")
                .replace("ç", "c")
                .replace("î", "i")
                .replace("ï", "i")
                .replace("ô", "o")
                .replace("ù", "u");
        return s;
    }

    private boolean containsAny(String normalizedHaystack, String... needles) {
        if (normalizedHaystack == null || normalizedHaystack.isBlank()) return false;
        for (String n : needles) {
            if (n == null || n.isBlank()) continue;
            if (normalizedHaystack.contains(normalize(n))) return true;
        }
        return false;
    }
}
