package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TrainingPointReportResponse(
        OffsetDateTime generatedAt,
        UUID clubId,
        String clubName,
        String academicTerm,
        OffsetDateTime from,
        OffsetDateTime to,
        int totalStudents,
        int totalPresentCheckIns,
        List<StudentTrainingPointItem> items
) {
    public record StudentTrainingPointItem(
            UUID userId,
            String fullName,
            String studentCode,
            String email,
            List<String> activeClubs,
            int presentEventCount,
            List<String> attendedEventTitles,
            List<AttendedEventItem> attendedEvents
    ) {
        public StudentTrainingPointItem(
                UUID userId,
                String fullName,
                String studentCode,
                String email,
                List<String> activeClubs,
                int presentEventCount,
                List<String> attendedEventTitles
        ) {
            this(userId, fullName, studentCode, email, activeClubs, presentEventCount, attendedEventTitles, List.of());
        }
    }

    public record AttendedEventItem(
            UUID eventId,
            UUID clubId,
            String clubCode,
            String clubName,
            String title,
            String academicTerm,
            OffsetDateTime startTime,
            String attendanceStatus,
            boolean attendanceLocked,
            OffsetDateTime attendanceLockedAt,
            String attendanceSignatureSha256
    ) {
    }
}
