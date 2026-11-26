package com.vju.club.dto.response;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.List;
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
        String coverImageUrl,
        UUID parentEventId,
        String parentEventTitle,
        String boothCode,
        String venueMapUrl,
        String facebookPostUrl,
        String recapAlbumUrl,
        boolean allowShuttleBus,
        int childBoothCount,
        List<EventCoHostResponse> coHosts
) implements Serializable {
    public EventResponse {
        coHosts = coHosts == null ? List.of() : List.copyOf(coHosts);
    }

    public EventResponse(UUID id, UUID clubId, String clubCode, String clubName, UUID departmentId,
                         String departmentName, String title, String description, String eventType,
                         String location, OffsetDateTime startTime, OffsetDateTime endTime,
                         OffsetDateTime registrationDeadline, boolean allowCtv, boolean requiresSubmission,
                         Integer maxParticipants, String status, OffsetDateTime completedAt,
                         OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this(id, clubId, clubCode, clubName, departmentId, departmentName, title, description, eventType,
                location, startTime, endTime, registrationDeadline, allowCtv, false, requiresSubmission,
                maxParticipants, status, completedAt, createdAt, updatedAt, null, null, null, null, null, null,
                null, null, null, null, null, null, false, 0, List.of());
    }

    public EventResponse(UUID id, UUID clubId, String clubCode, String clubName, UUID departmentId,
                         String departmentName, String title, String description, String eventType,
                         String location, OffsetDateTime startTime, OffsetDateTime endTime,
                         OffsetDateTime registrationDeadline, boolean allowCtv, boolean allowPublicAttendees,
                         boolean requiresSubmission, Integer maxParticipants, String status,
                         OffsetDateTime completedAt, OffsetDateTime createdAt, OffsetDateTime updatedAt,
                         String academicTerm, OffsetDateTime attendanceLockedAt, UUID attendanceLockedBy,
                         String attendanceSignatureSha256, String certificateTemplateUrl, String coverImageUrl) {
        this(id, clubId, clubCode, clubName, departmentId, departmentName, title, description, eventType,
                location, startTime, endTime, registrationDeadline, allowCtv, allowPublicAttendees, requiresSubmission,
                maxParticipants, status, completedAt, createdAt, updatedAt, academicTerm, attendanceLockedAt,
                attendanceLockedBy, attendanceSignatureSha256, certificateTemplateUrl, coverImageUrl,
                null, null, null, null, null, null, false, 0, List.of());
    }

    public static EventResponse withBoothCount(EventResponse s, int count) {
        if (count == s.childBoothCount()) {
            return s;
        }
        return new EventResponse(
                s.id(), s.clubId(), s.clubCode(), s.clubName(), s.departmentId(), s.departmentName(), s.title(), s.description(),
                s.eventType(), s.location(), s.startTime(), s.endTime(), s.registrationDeadline(), s.allowCtv(), s.allowPublicAttendees(),
                s.requiresSubmission(), s.maxParticipants(), s.status(), s.completedAt(), s.createdAt(), s.updatedAt(), s.academicTerm(),
                s.attendanceLockedAt(), s.attendanceLockedBy(), s.attendanceSignatureSha256(), s.certificateTemplateUrl(),
                s.coverImageUrl(), s.parentEventId(), s.parentEventTitle(), s.boothCode(), s.venueMapUrl(), s.facebookPostUrl(),
                s.recapAlbumUrl(), s.allowShuttleBus(), count, s.coHosts()
        );
    }
}
