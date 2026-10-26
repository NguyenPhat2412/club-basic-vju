package com.vju.club.modules.clubapplication.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

public record UpsertClubApplicationFormRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 4000) String description,
        String status,
        OffsetDateTime openAt,
        OffsetDateTime closeAt,
        List<FormFieldDefinition> fields,
        Boolean allowAttachments,
        Boolean requireAttachment,
        @Min(1) @Max(20) Integer maxAttachments,
        Boolean isDefault
) { }
