package com.example.secureapp.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findByTargetUserIdOrderByCreatedAtDesc(Long targetUserId);
    List<NotificationEntity> findByTargetUserIdOrderByCreatedAtDesc(Long targetUserId, Pageable pageable);
    List<NotificationEntity> findByTargetUserIdAndLuFalseOrderByCreatedAtDesc(Long targetUserId, Pageable pageable);
    long countByTargetUserIdAndLuFalse(Long targetUserId);
    void deleteByTargetUserId(Long targetUserId);
}
