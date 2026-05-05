package com.example.secureapp.chatbot;

public record NlpResult(
        Entity entity,
        Action action,
        Status status
) {
    public enum Entity { FACTURE, DOSSIER, MISSION, UNKNOWN }
    public enum Action { GET_ALL, UNKNOWN }
    public enum Status {
        REFUSED,
        PAID,
        PENDING,
        VALIDATED,
        OPEN,
        CLOSED,
        TO_VALIDATE,
        LATE,
        ASSIGNED,
        IN_PROGRESS,
        DONE,
        CANCELLED,
        FAILED,
        ANY
    }
}
