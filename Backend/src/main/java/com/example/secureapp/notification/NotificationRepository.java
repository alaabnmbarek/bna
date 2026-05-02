package com.example.secureapp.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findByTargetUserIdOrderByCreatedAtDesc(Long targetUserId);
    long countByTargetUserIdAndLuFalse(Long targetUserId);
    void deleteByTargetUserId(Long targetUserId);
}
