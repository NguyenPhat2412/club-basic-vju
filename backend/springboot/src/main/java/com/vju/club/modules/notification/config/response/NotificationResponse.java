package com.vju.club.modules.notification.config.response;
import com.vju.club.modules.notification.entity.Notification;
import java.time.OffsetDateTime;
import java.util.UUID;
public record NotificationResponse(UUID id, String title, String message, boolean read, UUID referenceId, OffsetDateTime createdAt) { public static NotificationResponse from(Notification n){return new NotificationResponse(n.getId(),n.getTitle(),n.getMessage(),n.isRead(),n.getReferenceId(),n.getCreatedAt());} }
