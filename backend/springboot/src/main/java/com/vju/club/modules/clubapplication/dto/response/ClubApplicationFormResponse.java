package com.vju.club.modules.clubapplication.dto.response;

import com.vju.club.modules.clubapplication.dto.request.FormFieldDefinition;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ClubApplicationFormResponse(
        UUID id,
        UUID clubId,
        String clubCode,
        String clubName,
        String title,
        String description,
        String status,
        OffsetDateTime openAt,
        OffsetDateTime closeAt,
        List<FormFieldDefinition> fields,
        boolean allowAttachments,
        boolean requireAttachment,
        int maxAttachments,
        boolean isDefault,
        List<ClubApplicationFileResponse> templateFiles,
        List<DepartmentOption> departments,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public record DepartmentOption(UUID id, String name, String description) { }
}
