package com.vju.club.modules.audit.service;

import com.vju.club.modules.audit.enums.AuditAction;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.modules.audit.entity.AuditLog;
import com.vju.club.modules.audit.repository.AuditLogRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

public interface AuditService {

    void record(UUID actorUserId, AuditAction action, UUID resourceId, UUID clubId, Map<String, ?> before, Map<String, ?> after);

    void recordChange(UUID actorUserId, AuditAction action, UUID resourceId, UUID clubId, Map<String, ?> before, Map<String, ?> after);

}
