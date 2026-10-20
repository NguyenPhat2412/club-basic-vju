package com.vju.club.modules.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record BroadcastNotificationRequest(
        @NotBlank @Size(max = 160) String title,
        @NotBlank @Size(max = 2000) String message,
        UUID departmentId
) {
}
