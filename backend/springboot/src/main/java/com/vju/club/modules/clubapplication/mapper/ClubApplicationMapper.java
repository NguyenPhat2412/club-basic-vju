package com.vju.club.modules.clubapplication.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.modules.clubapplication.dto.record.ClubApplicationRecord;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationFileResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationResponse;
import com.vju.club.modules.clubapplication.dto.response.ClubApplicationSummaryResponse;
import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.entity.ClubApplicationFile;
import com.vju.club.modules.membership.entity.Membership;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Mapper
public interface ClubApplicationMapper {
    ObjectMapper JSON = new ObjectMapper();

    default ClubApplicationResponse toResponse(ClubApplication application) {
        return toResponse(application, null, Collections.emptyList());
    }

    default ClubApplicationResponse toResponse(ClubApplication application, Membership membership) {
        return toResponse(application, membership, Collections.emptyList());
    }

    @Mapping(target = "id", source = "application.id")
    @Mapping(target = "applicantId", source = "application.applicant.id")
    @Mapping(target = "applicantName", source = "application.applicant.fullName")
    @Mapping(target = "applicantEmail", source = "application.applicant.email")
    @Mapping(target = "applicantStudentCode", source = "application.applicant.studentCode")
    @Mapping(target = "clubId", source = "application.club.id")
    @Mapping(target = "clubCode", source = "application.club.code")
    @Mapping(target = "clubName", source = "application.club.name")
    @Mapping(target = "formId", source = "application.form.id")
    @Mapping(target = "preferredDepartmentId", source = "application.preferredDepartment.id")
    @Mapping(target = "preferredDepartmentName", source = "application.preferredDepartment.name")
    @Mapping(target = "secondaryDepartmentId", source = "application.secondaryDepartment.id")
    @Mapping(target = "secondaryDepartmentName", source = "application.secondaryDepartment.name")
    @Mapping(target = "applicantPhone", source = "application.applicantPhone")
    @Mapping(target = "facultyMajor", source = "application.facultyMajor")
    @Mapping(target = "academicYear", source = "application.academicYear")
    @Mapping(target = "gpa", source = "application.gpa")
    @Mapping(target = "socialPortfolioUrl", source = "application.socialPortfolioUrl")
    @Mapping(target = "selfIntroduction", source = "application.selfIntroduction")
    @Mapping(target = "skillsExperience", source = "application.skillsExperience")
    @Mapping(target = "availability", source = "application.availability")
    @Mapping(target = "message", source = "application.message")
    @Mapping(target = "customAnswers", expression = "java(parseJsonMap(application.getCustomAnswers()))")
    @Mapping(target = "attachments", source = "attachments")
    @Mapping(target = "status", source = "application.status")
    @Mapping(target = "reviewedBy", source = "application.reviewedBy.id")
    @Mapping(target = "reviewedAt", source = "application.reviewedAt")
    @Mapping(target = "reviewNote", source = "application.reviewNote")
    @Mapping(target = "cancelledAt", source = "application.cancelledAt")
    @Mapping(target = "createdAt", source = "application.createdAt")
    @Mapping(target = "updatedAt", source = "application.updatedAt")
    @Mapping(target = "membershipId", source = "membership.id")
    @Mapping(target = "membershipStatus", source = "membership.status")
    @Mapping(target = "membershipJoinedAt", source = "membership.joinedAt")
    ClubApplicationResponse toResponse(ClubApplication application, Membership membership,
                                       List<ClubApplicationFileResponse> attachments);

    default ClubApplicationSummaryResponse toSummary(ClubApplication application) {
        return toSummary(application, 0);
    }

    @Mapping(target = "id", source = "application.id")
    @Mapping(target = "clubId", source = "application.club.id")
    @Mapping(target = "clubCode", source = "application.club.code")
    @Mapping(target = "clubName", source = "application.club.name")
    @Mapping(target = "preferredDepartmentId", source = "application.preferredDepartment.id")
    @Mapping(target = "preferredDepartmentName", source = "application.preferredDepartment.name")
    @Mapping(target = "facultyMajor", source = "application.facultyMajor")
    @Mapping(target = "academicYear", source = "application.academicYear")
    @Mapping(target = "status", source = "application.status")
    @Mapping(target = "attachmentCount", source = "attachmentCount")
    @Mapping(target = "createdAt", source = "application.createdAt")
    @Mapping(target = "reviewedAt", source = "application.reviewedAt")
    @Mapping(target = "cancelledAt", source = "application.cancelledAt")
    ClubApplicationSummaryResponse toSummary(ClubApplication application, int attachmentCount);

    default ClubApplicationFileResponse toFileResponse(ClubApplicationFile file) {
        if (file == null) return null;
        return new ClubApplicationFileResponse(
                file.getId(),
                file.getClub() != null ? file.getClub().getId() : null,
                file.getForm() != null ? file.getForm().getId() : null,
                file.getApplication() != null ? file.getApplication().getId() : null,
                file.getFileCategory(),
                file.getOriginalName(),
                file.getFileType(),
                file.getContentType(),
                file.getSizeBytes(),
                file.getChecksumSha256(),
                file.getUploadedBy(),
                file.getCreatedAt(),
                "/api/v1/application-files/" + file.getId() + "/download"
        );
    }

    default Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return JSON.readValue(json, new TypeReference<>() { });
        } catch (IOException exception) {
            return Collections.emptyMap();
        }
    }

    @Mapping(target = "applicantId", source = "applicant.id")
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "clubCode", source = "club.code")
    @Mapping(target = "clubName", source = "club.name")
    @Mapping(target = "reviewedBy", source = "reviewedBy.id")
    ClubApplicationRecord toRecord(ClubApplication application);
}
