package com.example.secureapp.notification;

import java.time.LocalDateTime;

public final class NotificationDtos {
    private NotificationDtos() {}

    public record NotificationResponse(
            Long id,
            String message,
            NotificationType type,
            NotificationPriority priority,
            LocalDateTime date,
            boolean lu,
            Long utilisateurCibleId,
            String resourceType,
            Long resourceId
    ) {}

    public record UnreadCountResponse(long unreadCount) {}
}
