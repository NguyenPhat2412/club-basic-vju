package com.vju.club.modules.document.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentVersionResponse(
        UUID id, UUID documentId, int version, String originalName, String contentType,
        long sizeBytes, String checksumSha256, UUID uploadedBy, OffsetDateTime createdAt) { }
