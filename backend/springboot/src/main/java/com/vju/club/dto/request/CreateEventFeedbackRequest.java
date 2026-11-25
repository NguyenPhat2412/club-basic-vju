package com.vju.club.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record CreateEventFeedbackRequest(
        @Min(1) @Max(5) int rating,
        @Size(max = 1000) String comment
) {
}
