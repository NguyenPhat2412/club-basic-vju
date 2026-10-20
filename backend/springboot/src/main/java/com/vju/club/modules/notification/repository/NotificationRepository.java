package com.vju.club.modules.notification.repository;

import com.vju.club.modules.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUser_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUser_IdAndReadFalse(UUID userId);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllReadByUserId(@Param("userId") UUID userId);
}
