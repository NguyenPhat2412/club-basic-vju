package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ToggleChatReactionRequest(
        @NotBlank(message = "Emoji reaction is required")
        @Size(max = 24, message = "Emoji must be at most 24 characters")
        String emoji
) {
}
