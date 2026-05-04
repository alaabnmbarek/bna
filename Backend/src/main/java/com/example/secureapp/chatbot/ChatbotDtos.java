package com.example.secureapp.chatbot;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class ChatbotDtos {
    private ChatbotDtos() {}

    public record ChatRequest(
            @NotBlank String message,
            Integer maxResults
    ) {}

    public record ChatAction(
            String type,
            String label,
            String route
    ) {}

    public record ChatItem(
            String module,
            Long id,
            String title,
            String subtitle,
            String status,
            String date
    ) {}

    public record ChatResponse(
            String answer,
            String intent,
            List<ChatItem> items,
            List<ChatAction> actions
    ) {}
}
