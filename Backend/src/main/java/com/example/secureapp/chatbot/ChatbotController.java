package com.example.secureapp.chatbot;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {
    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping("/message")
    @PreAuthorize("isAuthenticated()")
    public ChatbotDtos.ChatResponse message(@Valid @RequestBody ChatbotDtos.ChatRequest request, Authentication authentication) {
        return chatbotService.handle(request, authentication);
    }
}
