package com.example.secureapp.notification;

import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository, SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public NotificationDtos.NotificationResponse notifyUser(Long targetUserId, String message, NotificationType type, NotificationPriority priority, String resourceType, Long resourceId) {
        if (targetUserId == null) throw new IllegalArgumentException("targetUserId obligatoire");
        NotificationEntity entity = new NotificationEntity();
        entity.setTargetUserId(targetUserId);
        entity.setMessage(message);
        entity.setType(type != null ? type : NotificationType.INFO);
        entity.setPriority(priority != null ? priority : NotificationPriority.NORMAL);
        entity.setResourceType(resourceType);
        entity.setResourceId(resourceId);
        NotificationDtos.NotificationResponse payload = toResponse(notificationRepository.save(entity));

        String username = userRepository.findById(targetUserId).map(UserEntity::getUsername).orElse(null);
        if (username != null) {
            messagingTemplate.convertAndSendToUser(username, "/queue/notifications", payload);
        }
        return payload;
    }

    @Transactional
    public void notifyRole(String roleName, String message, NotificationType type, NotificationPriority priority, String resourceType, Long resourceId) {
        if (roleName == null || roleName.isBlank()) return;
        List<UserEntity> users = userRepository.findByRole_NameAndEnabledTrueOrderByFullNameAsc(roleName);
        for (UserEntity u : users) {
            notifyUser(u.getId(), message, type, priority, resourceType, resourceId);
        }
    }

    @Transactional
    public void notifyGlobal(String message, NotificationType type, NotificationPriority priority, String resourceType, Long resourceId) {
        NotificationEntity entity = new NotificationEntity();
        entity.setTargetUserId(null);
        entity.setMessage(message);
        entity.setType(type != null ? type : NotificationType.INFO);
        entity.setPriority(priority != null ? priority : NotificationPriority.NORMAL);
        entity.setResourceType(resourceType);
        entity.setResourceId(resourceId);
        NotificationDtos.NotificationResponse payload = toResponse(notificationRepository.save(entity));
        messagingTemplate.convertAndSend("/topic/notifications", payload);
    }

    @Transactional(readOnly = true)
    public List<NotificationDtos.NotificationResponse> listMine(Authentication authentication) {
        UserEntity me = requireCurrentUser(authentication);
        return notificationRepository.findByTargetUserIdOrderByCreatedAtDesc(me.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public NotificationDtos.UnreadCountResponse unreadCount(Authentication authentication) {
        UserEntity me = requireCurrentUser(authentication);
        return new NotificationDtos.UnreadCountResponse(notificationRepository.countByTargetUserIdAndLuFalse(me.getId()));
    }

    @Transactional
    public void markRead(Long id, Authentication authentication) {
        UserEntity me = requireCurrentUser(authentication);
        NotificationEntity entity = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Notification non trouvée"));
        if (!Objects.equals(entity.getTargetUserId(), me.getId())) throw new AccessDeniedException("Accès refusé");
        entity.setLu(true);
        notificationRepository.save(entity);
    }

    @Transactional
    public void markAllRead(Authentication authentication) {
        UserEntity me = requireCurrentUser(authentication);
        List<NotificationEntity> all = notificationRepository.findByTargetUserIdOrderByCreatedAtDesc(me.getId());
        boolean changed = false;
        for (NotificationEntity n : all) {
            if (!n.isLu()) {
                n.setLu(true);
                changed = true;
            }
        }
        if (changed) notificationRepository.saveAll(all);
    }

    @Transactional
    public void clearMine(Authentication authentication) {
        UserEntity me = requireCurrentUser(authentication);
        notificationRepository.deleteByTargetUserId(me.getId());
    }

    private UserEntity requireCurrentUser(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        return userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    private NotificationDtos.NotificationResponse toResponse(NotificationEntity e) {
        return new NotificationDtos.NotificationResponse(
                e.getId(),
                e.getMessage(),
                e.getType(),
                e.getPriority(),
                e.getCreatedAt(),
                e.isLu(),
                e.getTargetUserId(),
                e.getResourceType(),
                e.getResourceId()
        );
    }
}
