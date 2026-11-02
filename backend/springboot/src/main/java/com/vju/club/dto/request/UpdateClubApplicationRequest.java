package com.vju.club.dto.request;

import com.vju.club.enums.ClubApplicationStatus;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.UUID;

public record UpdateClubApplicationRequest(
        UUID preferredDepartmentId,
        UUID secondaryDepartmentId,
        @Size(max = 30) String applicantPhone,
        @Size(max = 150) String facultyMajor,
        @Size(max = 50) String academicYear,
        @Size(max = 20) String gpa,
        @Size(max = 500) String socialPortfolioUrl,
        @Size(max = 2000) String selfIntroduction,
        @Size(max = 2000) String skillsExperience,
        @Size(max = 500) String availability,
        @Size(max = 2000) String message,
        Map<String, Object> customAnswers,
        ClubApplicationStatus status,
        @Size(max = 1000) String reviewNote,
        @Size(max = 1000) String internalNote,
        UUID assignDepartmentId
) {
    public UpdateClubApplicationRequest(
            UUID preferredDepartmentId,
            UUID secondaryDepartmentId,
            String applicantPhone,
            String facultyMajor,
            String academicYear,
            String gpa,
            String socialPortfolioUrl,
            String selfIntroduction,
            String skillsExperience,
            String availability,
            String message,
            Map<String, Object> customAnswers) {
        this(preferredDepartmentId, secondaryDepartmentId, applicantPhone, facultyMajor, academicYear, gpa,
                socialPortfolioUrl, selfIntroduction, skillsExperience, availability, message, customAnswers,
                null, null, null, null);
    }

    public UpdateClubApplicationRequest(
            UUID preferredDepartmentId,
            UUID secondaryDepartmentId,
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
            ClubApplicationStatus status,
            String reviewNote,
            UUID assignDepartmentId) {
        this(preferredDepartmentId, secondaryDepartmentId, applicantPhone, facultyMajor, academicYear, gpa,
                socialPortfolioUrl, selfIntroduction, skillsExperience, availability, message, customAnswers,
                status, reviewNote, null, assignDepartmentId);
    }
}
