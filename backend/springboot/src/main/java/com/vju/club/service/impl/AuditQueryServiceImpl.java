package com.vju.club.service.impl;

import com.vju.club.common.AuditConstants;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.dto.response.AuditLogResponse;
import com.vju.club.entity.AuditLog;
import com.vju.club.enums.AuditAction;
import com.vju.club.mapper.AuditMapper;
import com.vju.club.repository.AuditLogRepository;
import com.vju.club.service.AuditQueryService;
import com.vju.club.specification.AuditLogSpecifications;
import com.vju.club.annotation.RequirePermission;
import com.vju.club.security.Actor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditQueryServiceImpl implements AuditQueryService {
    private final AuditLogRepository auditLogRepository;
    private final AuditMapper auditMapper;

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(AuditConstants.PERMISSION_VIEW)
    public PageResponse<AuditLogResponse> search(Actor actor, String resourceType, UUID resourceId, UUID actorUserId,
                                                 UUID clubId, String action, int offset, int limit) {
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
        var items = auditPage.getContent().stream().map(auditMapper::toResponse).toList();
        return new PageResponse<>(items, auditPage.getTotalElements(), offset, limit);
    }

    private static void requireKnown(String value, Enum<?>[] allowed, String field) {
        if (value != null && Arrays.stream(allowed).noneMatch(candidate -> candidate.name().equals(value))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", field + ": unknown value " + value);
        }
    }
}
