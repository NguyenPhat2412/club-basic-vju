package com.vju.club.modules.notification.dto.response;
import java.time.OffsetDateTime;
import java.util.UUID;
public record NotificationResponse(UUID id, String title, String message, boolean read, UUID referenceId, OffsetDateTime createdAt) { }
