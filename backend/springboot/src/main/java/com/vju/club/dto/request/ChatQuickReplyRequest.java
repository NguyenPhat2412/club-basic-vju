package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatQuickReplyRequest(
        @NotBlank @Size(max = 40) String shortcut,
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String content
) {
}
