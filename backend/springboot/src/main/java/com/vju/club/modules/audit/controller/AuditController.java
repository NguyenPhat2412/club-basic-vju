package com.vju.club.modules.audit.controller;

import com.vju.club.modules.audit.service.AuditQueryService;

import com.vju.club.modules.audit.service.AuditService;

import com.vju.club.modules.audit.dto.response.AuditLogResponse;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.security.Actor;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditController {

    private final AuditQueryService auditQueryService;

    public AuditController(AuditQueryService auditQueryService) {
        this.auditQueryService = auditQueryService;
    }

    @GetMapping
    public PageResponse<AuditLogResponse> search(Actor actor,
                                                 @RequestParam(required = false) String resourceType,
                                                 @RequestParam(required = false) UUID resourceId,
                                                 @RequestParam(required = false) UUID actorUserId,
                                                 @RequestParam(required = false) UUID clubId,
                                                 @RequestParam(required = false) String action,
                                                 @RequestParam(defaultValue = "0") @Min(0) int offset,
                                                 @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return auditQueryService.search(actor, resourceType, resourceId, actorUserId, clubId, action, offset, limit);
    }
}
