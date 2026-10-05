package com.vju.club.audit.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.vju.club.entity.AuditLog;

import java.io.IOException;
import java.io.UncheckedIOException;
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
) {
    private static final ObjectMapper JSON = new ObjectMapper();

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getActorUserId(), log.getAction(), log.getResourceType(),
                log.getResourceId(), log.getClubId(), parse(log.getOldValue()), parse(log.getNewValue()),
                log.getCreatedAt());
    }

    private static Map<String, Object> parse(String json) {
        if (json == null) return null;
        try {
            return JSON.readValue(json, new TypeReference<>() { });
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
