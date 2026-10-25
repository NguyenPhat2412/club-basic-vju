package com.vju.club.modules.audit.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record AuditLogResponse(
        UUID id,
        UUID actorUserId,
        String action,
        String resourceType,
        UUID resourceId,
        UUID clubId,
        Map<String, Object> oldValue,
        Map<String, Object> newValue,
        OffsetDateTime createdAt
) { }
