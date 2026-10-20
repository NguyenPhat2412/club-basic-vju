package com.vju.club.modules.audit.dto.record;

import com.vju.club.modules.audit.enums.AuditAction;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record AuditLogRecord(
        UUID id,
        UUID actorUserId,
        AuditAction action,
        String resourceType,
        UUID resourceId,
        UUID clubId,
        Map<String, Object> oldValue,
        Map<String, Object> newValue,
        OffsetDateTime createdAt
) { }
