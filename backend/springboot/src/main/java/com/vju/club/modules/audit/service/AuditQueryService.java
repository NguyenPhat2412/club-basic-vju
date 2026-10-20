package com.vju.club.modules.audit.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.audit.dto.response.AuditLogResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface AuditQueryService {
    PageResponse<AuditLogResponse> search(Actor actor, String resourceType, UUID resourceId, UUID actorUserId, UUID clubId, String action, int offset, int limit);
}
