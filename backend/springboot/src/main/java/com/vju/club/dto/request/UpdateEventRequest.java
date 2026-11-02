package com.vju.club.dto.request;

import com.vju.club.enums.EventStatus;
import com.vju.club.enums.EventType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UpdateEventRequest(
        UUID departmentId,
        @Size(max = 200) String title,
        @Size(max = 4000) String description,
        EventType eventType,
        @Size(max = 300) String location,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        OffsetDateTime registrationDeadline,
        Boolean allowCtv,
        @Min(1) Integer maxParticipants,
        EventStatus status
) {
}
