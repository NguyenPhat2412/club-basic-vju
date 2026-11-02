package com.vju.club.repository;

import com.vju.club.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUser_IdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<Notification> findByIdAndUser_Id(UUID id, UUID userId);

    long countByUser_IdAndReadFalse(UUID userId);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllReadByUserId(@Param("userId") UUID userId);

    @Modifying(flushAutomatically = true)
    @Query(value = "INSERT INTO notifications (user_id, title, message, read, reference_type, reference_id, event_key) "
            + "VALUES (:userId, :title, :message, FALSE, :referenceType, :referenceId, :eventKey) "
            + "ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING", nativeQuery = true)
    int insertIdempotent(@Param("userId") UUID userId,
                         @Param("title") String title,
                         @Param("message") String message,
                         @Param("referenceType") String referenceType,
                         @Param("referenceId") UUID referenceId,
                         @Param("eventKey") String eventKey);
}
