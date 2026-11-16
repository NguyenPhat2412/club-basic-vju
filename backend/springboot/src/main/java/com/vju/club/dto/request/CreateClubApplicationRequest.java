package com.vju.club.dto.request;

import static com.vju.club.common.UserConstants.PHONE_PATTERN;
import static com.vju.club.common.UserConstants.WEB_URL_PATTERN;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.util.Map;
import java.util.UUID;

public record CreateClubApplicationRequest(
        @NotBlank @Size(max = 2000) String message,
        UUID formId,
        UUID preferredDepartmentId,
        UUID secondaryDepartmentId,
        @Size(max = 32) @Pattern(regexp = PHONE_PATTERN, message = "may only contain digits, spaces and + ( ) - .") String applicantPhone,
        @Size(max = 150) String facultyMajor,
        @Size(max = 50) String academicYear,
        @Size(max = 20) String gpa,
        @Size(max = 500) @URL(regexp = WEB_URL_PATTERN) String socialPortfolioUrl,
        @Size(max = 2000) String selfIntroduction,
        @Size(max = 2000) String skillsExperience,
        @Size(max = 500) String availability,
        @Size(max = 50) Map<@NotBlank @Size(max = 100) String, Object> customAnswers,
        UUID applicantId
) {
    public CreateClubApplicationRequest(String message) {
        this(message, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    public CreateClubApplicationRequest(
            String message,
            UUID formId,
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
            Map<String, Object> customAnswers) {
        this(message, formId, preferredDepartmentId, secondaryDepartmentId, applicantPhone, facultyMajor,
                academicYear, gpa, socialPortfolioUrl, selfIntroduction, skillsExperience, availability,
                customAnswers, null);
    }
}
