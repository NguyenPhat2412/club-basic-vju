package com.vju.club.modules.document.dto.record;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentRecord(
        UUID id,
        UUID clubId,
        UUID ownerId,
        String name,
        String path,
        int version,
        String contentType,
        long sizeBytes,
        String checksumSha256,
        String appDetailKey,
        boolean deleted,
        OffsetDateTime deletedAt,
        UUID deletedBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
