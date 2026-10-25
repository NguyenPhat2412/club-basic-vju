package com.vju.club.modules.audit.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.modules.audit.dto.response.AuditLogResponse;
import com.vju.club.modules.audit.entity.AuditLog;
import org.mapstruct.Mapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;

@Mapper
public interface AuditMapper {
    ObjectMapper JSON = new ObjectMapper();

    AuditLogResponse toResponse(AuditLog log);

    default Map<String, Object> jsonToMap(String json) {
        if (json == null) return null;
        try {
            return JSON.readValue(json, new TypeReference<>() { });
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
