package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubStatisticsResponse(
        UUID clubId,
        String clubCode,
        String clubName,
        OffsetDateTime from,
        OffsetDateTime to,
        long activeMembers,
        long activeDepartments,
        long pendingApplications,
        long totalEvents,
        long openEvents,
        long completedEvents,
        long cancelledEvents,
        long uniqueParticipants,
        long activeRegistrations,
        long cancelledRegistrations,
        long attendedCount,
        long absentOrExcusedCount,
        long openTasks,
        long overdueTasks,
        long completedTasks,
        OffsetDateTime generatedAt
) {
}
