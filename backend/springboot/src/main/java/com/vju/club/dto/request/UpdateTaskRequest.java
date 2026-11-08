package com.vju.club.dto.request;

import com.vju.club.enums.TaskPriority;
import com.vju.club.enums.TaskStatus;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UpdateTaskRequest(
        @Size(max = 200) String title,
        @Size(max = 4000) String description,
        TaskPriority priority,
        OffsetDateTime deadline,
        UUID assigneeId,
        TaskStatus status
) {
}
