package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        UUID clubId,
        String clubCode,
        String clubName,
        UUID departmentId,
        String departmentName,
        UUID eventId,
        String eventTitle,
        UUID parentTaskId,
        String parentTaskTitle,
        String title,
        String description,
        String priority,
        String status,
        boolean overdue,
        int progressPercent,
        OffsetDateTime deadline,
        UUID assigneeId,
        String assigneeFullName,
        UUID assignerId,
        String assignerFullName,
        String progressNote,
        String reportLink,
        UUID verifiedBy,
        OffsetDateTime verifiedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
