package com.vju.club.modules.audit.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.UUID;

public record AuditLogSearchRequest(
        String resourceType,
        UUID resourceId,
        UUID actorUserId,
        UUID clubId,
        String action,
        @Min(0) int offset,
        @Min(1) @Max(100) int limit
) { }
