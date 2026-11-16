package com.vju.club.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AuditLogSearchRequest(
        @Size(max = 64) String resourceType,
        UUID resourceId,
        UUID actorUserId,
        UUID clubId,
        @Size(max = 64) String action,
        @Min(0) int offset,
        @Min(1) @Max(100) int limit
) { }
