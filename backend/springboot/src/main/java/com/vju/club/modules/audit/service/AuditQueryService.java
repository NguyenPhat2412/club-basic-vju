package com.vju.club.modules.audit.service;

import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.entity.AuditLog;
import com.vju.club.modules.audit.dto.response.AuditLogResponse;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.repository.AuditLogRepository;
import com.vju.club.modules.audit.specification.AuditLogSpecifications;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.UUID;

/** Read side of the audit trail; requires the global audit.view permission. */
@Service
public class AuditQueryService {

    private final AuditLogRepository auditLogRepository;
    private final PermissionAuthorizationService authorizationService;

    public AuditQueryService(AuditLogRepository auditLogRepository,
                             PermissionAuthorizationService authorizationService) {
        this.auditLogRepository = auditLogRepository;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> search(Actor actor, String resourceType, UUID resourceId, UUID actorUserId,
                                                 UUID clubId, String action, int offset, int limit) {
        authorizationService.require(actor, "audit.view", null, null);
        requireKnown(resourceType, AuditAction.ResourceType.values(), "resourceType");
        requireKnown(action, AuditAction.values(), "action");

        Specification<AuditLog> spec = Specification.where(AuditLogSpecifications.hasResourceType(resourceType))
                .and(AuditLogSpecifications.hasResourceId(resourceId))
                .and(AuditLogSpecifications.hasActorUserId(actorUserId))
                .and(AuditLogSpecifications.hasClubId(clubId))
                .and(AuditLogSpecifications.hasAction(action));

        Sort sort = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        OffsetLimitRequest page = new OffsetLimitRequest(offset, limit, sort);
        Page<AuditLog> auditPage = auditLogRepository.findAll(spec, page);
        var items = auditPage.getContent().stream().map(AuditLogResponse::from).toList();
        return new PageResponse<>(items, auditPage.getTotalElements(), offset, limit);
    }

    private static void requireKnown(String value, Enum<?>[] allowed, String field) {
        if (value != null && Arrays.stream(allowed).noneMatch(candidate -> candidate.name().equals(value))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", field + ": unknown value " + value);
        }
    }
}
