package com.vju.club.modules.audit.service;

import com.vju.club.modules.audit.enums.AuditAction;

import java.util.Map;
import java.util.UUID;

public interface AuditService {
    void record(UUID actorUserId, AuditAction action, UUID resourceId, UUID clubId, Map<String, ?> before, Map<String, ?> after);

    void recordChange(UUID actorUserId, AuditAction action, UUID resourceId, UUID clubId, Map<String, ?> before, Map<String, ?> after);
}
