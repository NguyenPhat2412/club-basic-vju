package com.vju.club.modules.task.dto.record;

import com.vju.club.modules.task.enums.TaskPriority;
import com.vju.club.modules.task.enums.TaskStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TaskRecord(
        UUID id,
        UUID clubId,
        UUID departmentId,
        UUID eventId,
        String title,
        String description,
        TaskPriority priority,
        TaskStatus status,
        int progressPercent,
        OffsetDateTime deadline,
        UUID assigneeId,
        UUID assignerId,
        String progressNote,
        String reportLink,
        UUID verifiedBy,
        OffsetDateTime verifiedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
