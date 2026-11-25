package com.vju.club.dto.response;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ClubStatisticsResponse(
        UUID clubId,
        String clubCode,
        String clubName,
        OffsetDateTime from,
        OffsetDateTime to,
        long activeMembers,
        long suspendedMembers,
        long leftMembers,
        long activeDepartments,
        long pendingApplications,
        long applicationsSubmitted,
        long periodPendingApplications,
        long approvedApplications,
        long rejectedApplications,
        long cancelledApplications,
        int approvalRate,
        long totalEvents,
        long draftEvents,
        long openEvents,
        long closedRegistrationEvents,
        long completedEvents,
        long cancelledEvents,
        long uniqueParticipants,
        long activeRegistrations,
        long memberRegistrations,
        long ctvRegistrations,
        long cancelledRegistrations,
        long attendedCount,
        long memberAttended,
        long ctvAttended,
        long absentOrExcusedCount,
        int attendanceRate,
        long openTasks,
        long todoTasks,
        long inProgressTasks,
        long reviewPendingTasks,
        long overdueTasks,
        long completedTasks,
        long cancelledTasks,
        int taskCompletionRate,
        long liveDocuments,
        long totalDocumentBytes,
        long chatChannels,
        long issuedCertificates,
        long acknowledgedCertificates,
        long pendingAcknowledgeCertificates,
        long revokedCertificates,
        int certificateAcknowledgementRate,
        List<DepartmentStatsItem> departmentBreakdown,
        OffsetDateTime generatedAt
) implements Serializable {

    public record DepartmentStatsItem(
            UUID departmentId,
            String departmentName,
            String status,
            long activeMembers,
            long firstChoiceApplications,
            long secondChoiceApplications,
            long openTasks,
            long completedTasks
    ) implements Serializable {
    }
}
