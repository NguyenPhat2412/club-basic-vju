package com.vju.club.repository;

import com.vju.club.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUser_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
