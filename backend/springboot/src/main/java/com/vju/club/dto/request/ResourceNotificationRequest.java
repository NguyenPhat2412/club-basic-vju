package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResourceNotificationRequest(
        @NotBlank @Size(max = 160) String title,
        @NotBlank @Size(max = 2000) String message,
        @Size(max = 80) String idempotencyKey,
        Boolean includeSubtasks
) {
    public ResourceNotificationRequest(String title, String message) {
        this(title, message, null, null);
    }
}
