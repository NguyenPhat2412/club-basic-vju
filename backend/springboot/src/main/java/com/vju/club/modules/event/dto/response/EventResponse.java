package com.vju.club.modules.event.dto.response;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EventResponse(
        UUID id,
        UUID clubId,
        String clubCode,
        String clubName,
        UUID departmentId,
        String departmentName,
        String title,
        String description,
        String eventType,
        String location,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        OffsetDateTime registrationDeadline,
        boolean allowCtv,
        Integer maxParticipants,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) implements Serializable {
}
