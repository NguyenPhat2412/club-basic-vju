package com.vju.club.dto.request;

import com.vju.club.enums.EventStatus;
import com.vju.club.enums.EventType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;
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
        Boolean allowPublicAttendees,
        Boolean requiresSubmission,
        @Min(1) @Max(100_000) Integer maxParticipants,
        EventStatus status,
        @Size(max = 16) String academicTerm,
        @Size(max = 500) String coverImageUrl,
        UUID parentEventId,
        @Size(max = 32) String boothCode,
        @Size(max = 500) String venueMapUrl,
        @Size(max = 500) String facebookPostUrl,
        @Size(max = 500) String recapAlbumUrl,
        Boolean allowShuttleBus,
        @Size(max = 20) List<UUID> coHostClubIds
) {
    public CreateEventRequest(UUID departmentId, String title, String description, EventType eventType,
                              String location, OffsetDateTime startTime, OffsetDateTime endTime,
                              OffsetDateTime registrationDeadline, Boolean allowCtv,
                              Boolean requiresSubmission, Integer maxParticipants, EventStatus status) {
        this(departmentId, title, description, eventType, location, startTime, endTime,
                registrationDeadline, allowCtv, null, requiresSubmission, maxParticipants, status, null, null,
                null, null, null, null, null, null, null);
    }

    public CreateEventRequest(UUID departmentId, String title, String description, EventType eventType,
                              String location, OffsetDateTime startTime, OffsetDateTime endTime,
                              OffsetDateTime registrationDeadline, Boolean allowCtv,
                              Boolean requiresSubmission, Integer maxParticipants, EventStatus status,
                              String academicTerm) {
        this(departmentId, title, description, eventType, location, startTime, endTime,
                registrationDeadline, allowCtv, null, requiresSubmission, maxParticipants, status, academicTerm, null,
                null, null, null, null, null, null, null);
    }

    public CreateEventRequest(UUID departmentId, String title, String description, EventType eventType,
                              String location, OffsetDateTime startTime, OffsetDateTime endTime,
                              OffsetDateTime registrationDeadline, Boolean allowCtv, Boolean allowPublicAttendees,
                              Boolean requiresSubmission, Integer maxParticipants, EventStatus status,
                              String academicTerm, String coverImageUrl) {
        this(departmentId, title, description, eventType, location, startTime, endTime,
                registrationDeadline, allowCtv, allowPublicAttendees, requiresSubmission, maxParticipants, status,
                academicTerm, coverImageUrl, null, null, null, null, null, null, null);
    }
}
