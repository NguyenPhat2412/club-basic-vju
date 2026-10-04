package com.vju.club.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.entity.AuditLog;
import com.vju.club.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Writes the audit trail. Callers run inside their own transaction, so an action and its audit row
 * are committed (or rolled back) together.
 */
@Service
public class AuditService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * @param actorUserId who acted; {@code null} only when nobody is signed in (self-registration)
     * @param clubId      club the action belongs to, so club-level history can be filtered
     * @param before      field values before the change ({@code null} for creations)
     * @param after       field values after the change ({@code null} for removals)
     */
    public void record(UUID actorUserId, AuditAction action, UUID resourceId, UUID clubId,
                       Map<String, ?> before, Map<String, ?> after) {
        auditLogRepository.save(new AuditLog(actorUserId, action.name(), action.resourceType().name(), resourceId,
                clubId, toJson(before), toJson(after)));
    }

    /** Records only the fields that actually changed; nothing is written for a no-op update. */
    public void recordChange(UUID actorUserId, AuditAction action, UUID resourceId, UUID clubId,
                             Map<String, ?> before, Map<String, ?> after) {
        Map<String, Object> oldValues = new LinkedHashMap<>();
        Map<String, Object> newValues = new LinkedHashMap<>();
        after.forEach((field, value) -> {
            Object previous = before.get(field);
            if (!Objects.equals(previous, value)) {
                oldValues.put(field, previous);
                newValues.put(field, value);
            }
        });
        if (!newValues.isEmpty()) {
            record(actorUserId, action, resourceId, clubId, oldValues, newValues);
        }
    }

    private static String toJson(Map<String, ?> values) {
        if (values == null) return null;
        Map<String, Object> printable = new LinkedHashMap<>();
        values.forEach((key, value) -> printable.put(key, value == null || value instanceof Number
                || value instanceof Boolean ? value : value.toString()));
        try {
            return JSON.writeValueAsString(printable);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Audit values are not serializable", exception);
        }
    }
}
