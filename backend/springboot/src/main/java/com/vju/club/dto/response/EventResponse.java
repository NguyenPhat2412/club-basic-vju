package com.vju.club.dto.response;

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
        boolean allowPublicAttendees,
        boolean requiresSubmission,
        Integer maxParticipants,
        String status,
        OffsetDateTime completedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String academicTerm,
        OffsetDateTime attendanceLockedAt,
        UUID attendanceLockedBy,
        String attendanceSignatureSha256,
        String certificateTemplateUrl,
        String coverImageUrl
) implements Serializable {
    public EventResponse(UUID id, UUID clubId, String clubCode, String clubName, UUID departmentId,
                         String departmentName, String title, String description, String eventType,
                         String location, OffsetDateTime startTime, OffsetDateTime endTime,
                         OffsetDateTime registrationDeadline, boolean allowCtv, boolean requiresSubmission,
                         Integer maxParticipants, String status, OffsetDateTime completedAt,
                         OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this(id, clubId, clubCode, clubName, departmentId, departmentName, title, description, eventType,
                location, startTime, endTime, registrationDeadline, allowCtv, false, requiresSubmission,
                maxParticipants, status, completedAt, createdAt, updatedAt, null, null, null, null, null, null);
    }
}
