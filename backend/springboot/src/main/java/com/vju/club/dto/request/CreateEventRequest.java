package com.vju.club.dto.request;

import com.vju.club.enums.EventStatus;
import com.vju.club.enums.EventType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CreateEventRequest(
        UUID departmentId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 4000) String description,
        EventType eventType,
        @Size(max = 300) String location,
        @NotNull OffsetDateTime startTime,
        @NotNull OffsetDateTime endTime,
        @NotNull OffsetDateTime registrationDeadline,
        Boolean allowCtv,
        @Min(1) Integer maxParticipants,
        EventStatus status
) {
}
