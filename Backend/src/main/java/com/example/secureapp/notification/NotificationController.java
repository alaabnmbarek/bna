package com.example.secureapp.notification;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationDtos.NotificationResponse> listMine(Authentication authentication) {
        return notificationService.listMine(authentication);
    }

    @GetMapping("/unread-count")
    public NotificationDtos.UnreadCountResponse unreadCount(Authentication authentication) {
        return notificationService.unreadCount(authentication);
    }

    @PatchMapping("/{id}/read")
    public void markRead(@PathVariable Long id, Authentication authentication) {
        notificationService.markRead(id, authentication);
    }

    @PostMapping("/mark-all-read")
    public void markAllRead(Authentication authentication) {
        notificationService.markAllRead(authentication);
    }

    @DeleteMapping
    public void clear(Authentication authentication) {
        notificationService.clearMine(authentication);
    }
}
