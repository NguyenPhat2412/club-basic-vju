package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentResponse(
        UUID id, UUID clubId, UUID departmentId, String departmentName,
        String scope, String visibility, UUID ownerId, String name, String path, int version,
        String contentType, long sizeBytes, String checksumSha256, String appDetailKey,
        boolean previewable, boolean deleted, OffsetDateTime deletedAt, UUID deletedBy,
        OffsetDateTime createdAt, OffsetDateTime updatedAt) { }
