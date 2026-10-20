package com.vju.club.modules.chat.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record SummarizeChatRequest(
        @Min(1) @Max(200) Integer messageLimit,
        Boolean postToChannel
) {
}
