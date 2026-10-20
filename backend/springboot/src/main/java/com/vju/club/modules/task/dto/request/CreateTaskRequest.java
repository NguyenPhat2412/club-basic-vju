package com.vju.club.modules.task.dto.request;

import com.vju.club.modules.task.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CreateTaskRequest(
        UUID departmentId,
        UUID eventId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 4000) String description,
        TaskPriority priority,
        @NotNull OffsetDateTime deadline,
        @NotNull UUID assigneeId
) {
}
