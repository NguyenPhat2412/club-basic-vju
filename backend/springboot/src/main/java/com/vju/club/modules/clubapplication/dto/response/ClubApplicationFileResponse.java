package com.vju.club.modules.clubapplication.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubApplicationFileResponse(
        UUID id,
        UUID clubId,
        UUID formId,
        UUID applicationId,
        String fileCategory,
        String originalName,
        String fileType,
        String contentType,
        long sizeBytes,
        String checksumSha256,
        UUID uploadedBy,
        OffsetDateTime createdAt,
        String downloadUrl
) { }
