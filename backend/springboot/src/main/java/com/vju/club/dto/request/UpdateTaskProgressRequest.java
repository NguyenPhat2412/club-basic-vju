package com.vju.club.dto.request;

import com.vju.club.enums.TaskStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateTaskProgressRequest(
        TaskStatus status,
        @Min(0) @Max(100) Integer progressPercent,
        @Size(max = 2000) String progressNote,
        @Size(max = 1000) String reportLink
) {
}
