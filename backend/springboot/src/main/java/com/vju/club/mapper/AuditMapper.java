package com.vju.club.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.dto.record.AuditLogRecord;
import com.vju.club.dto.response.AuditLogResponse;
import com.vju.club.entity.AuditLog;
import org.mapstruct.Mapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;

@Mapper
public interface AuditMapper {
    ObjectMapper JSON = new ObjectMapper();

    AuditLogResponse toResponse(AuditLog log);

    AuditLogRecord toRecord(AuditLog log);

    default Map<String, Object> jsonToMap(String json) {
        if (json == null) return null;
        try {
            return JSON.readValue(json, new TypeReference<>() { });
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
