package com.vju.club.dto.request;

import com.vju.club.common.NotificationConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateNotificationRequest(
        @NotNull UUID userId,
        @NotBlank @Size(max = NotificationConstants.MAX_TITLE_LENGTH) String title,
        @NotBlank @Size(max = NotificationConstants.MAX_MESSAGE_LENGTH) String message,
        UUID referenceId
) { }
