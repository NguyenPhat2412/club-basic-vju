package com.vju.club.modules.event.dto.record;

import com.vju.club.modules.event.enums.EventStatus;
import com.vju.club.modules.event.enums.EventType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventRecord(
        UUID id,
        UUID clubId,
        UUID departmentId,
        String title,
        String description,
        EventType eventType,
        String location,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        OffsetDateTime registrationDeadline,
        boolean allowCtv,
        Integer maxParticipants,
        EventStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
