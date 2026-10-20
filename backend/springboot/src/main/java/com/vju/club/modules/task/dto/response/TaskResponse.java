package com.vju.club.modules.task.dto.response;

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
        String title,
        String description,
        String priority,
        String status,
        int progressPercent,
        OffsetDateTime deadline,
        UUID assigneeId,
        String assigneeFullName,
        String assigneeEmail,
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
