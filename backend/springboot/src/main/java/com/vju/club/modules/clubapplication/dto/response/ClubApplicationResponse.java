package com.vju.club.modules.clubapplication.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ClubApplicationResponse(
        UUID id,
        UUID applicantId,
        String applicantName,
        String applicantEmail,
        String applicantStudentCode,
        UUID clubId,
        String clubCode,
        String clubName,
        UUID formId,
        UUID preferredDepartmentId,
        String preferredDepartmentName,
        UUID secondaryDepartmentId,
        String secondaryDepartmentName,
        String applicantPhone,
        String facultyMajor,
        String academicYear,
        String gpa,
        String socialPortfolioUrl,
        String selfIntroduction,
        String skillsExperience,
        String availability,
        String message,
        Map<String, Object> customAnswers,
        List<ClubApplicationFileResponse> attachments,
        String status,
        UUID reviewedBy,
        OffsetDateTime reviewedAt,
        String reviewNote,
        OffsetDateTime cancelledAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        UUID membershipId,
        String membershipStatus,
        OffsetDateTime membershipJoinedAt
) { }
