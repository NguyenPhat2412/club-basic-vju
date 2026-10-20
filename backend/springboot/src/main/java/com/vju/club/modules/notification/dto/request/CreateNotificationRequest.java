package com.vju.club.modules.notification.dto.request;

import com.vju.club.modules.notification.annotation.ValidNotificationMessage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateNotificationRequest(
        @NotNull UUID userId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @ValidNotificationMessage String message,
        UUID referenceId
) { }
