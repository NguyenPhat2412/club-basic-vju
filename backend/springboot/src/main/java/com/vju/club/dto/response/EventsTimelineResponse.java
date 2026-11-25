package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record EventsTimelineResponse(
        OffsetDateTime generatedAt,
        String academicTerm,
        OffsetDateTime from,
        OffsetDateTime to,
        int totalUnits,
        int totalEvents,
        List<TimelineUnitSummary> units
) {
    public record TimelineUnitSummary(
            UUID clubId,
            String clubCode,
            String clubName,
            int eventCount,
            long totalRegistrations,
            long totalPresent,
            double participationRate,
            List<TimelineEventItem> events
    ) {
    }

    public record TimelineEventItem(
            UUID id,
            UUID clubId,
            String clubCode,
            String clubName,
            String title,
            String eventType,
            String status,
            String location,
            String academicTerm,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            long registrationCount,
            long presentCount,
            Integer maxParticipants,
            double participationRate,
            boolean attendanceLocked,
            String attendanceSignatureSha256
    ) {
    }
}
