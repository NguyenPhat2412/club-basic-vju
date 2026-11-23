package com.vju.club.service.impl;

import com.vju.club.common.DocumentConstants;
import com.vju.club.entity.Document;
import com.vju.club.enums.DocumentScope;
import com.vju.club.enums.DocumentVisibility;
import com.vju.club.error.ApiException;
import com.vju.club.exception.DocumentNotFoundException;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DocumentAccessPolicy {
    private final PermissionAuthorizationService authorizationService;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final UserPermissionRepository userPermissionRepository;

    public boolean canSeeSystemOfficerDocs(Actor actor) {
        return authorizationService.hasGlobalPermission(actor, DocumentConstants.PERMISSION_VIEW)
                || authorizationService.hasAnyPermission(actor, DocumentConstants.PERMISSION_DELETE);
    }

    public boolean isClubOfficer(Actor actor, UUID clubId) {
        return authorizationService.hasGlobalPermission(actor, DocumentConstants.PERMISSION_VIEW)
                || authorizationService.hasPermission(actor, DocumentConstants.PERMISSION_DELETE, clubId, null)
                || authorizationService.hasPermission(actor, DocumentConstants.PERMISSION_RESTORE, clubId, null);
    }

    public Set<UUID> allowedDepartmentIds(Actor actor, UUID clubId) {
        Set<UUID> ids = new LinkedHashSet<>(departmentMemberRepository.findActiveDepartmentIdsInClub(clubId, actor.id()));
        userPermissionRepository.findEffective(actor.id()).stream()
                .filter(row -> DocumentConstants.PERMISSION_VIEW.equals(row.getPermissionKey())
                        && "DEPARTMENT".equals(row.getScope())
                        && clubId.equals(row.getClubId())
                        && row.getDepartmentId() != null)
                .map(UserPermissionRepository.EffectivePermissionRow::getDepartmentId)
                .forEach(ids::add);
        return ids;
    }

    public Document requireVisible(Actor actor, Optional<Document> found) {
        Document document = found.orElseThrow(() -> authorizationService.missingResource(actor,
                DocumentConstants.PERMISSION_VIEW, new DocumentNotFoundException()));
        DocumentScope scope = document.getScope() != null ? document.getScope() : DocumentScope.CLUB;

        if (scope == DocumentScope.SYSTEM) {
            if (document.getVisibility() == DocumentVisibility.OFFICERS && !canSeeSystemOfficerDocs(actor)) {
                throw forbidden();
            }
            if (document.isDeleted()
                    && !authorizationService.hasGlobalPermission(actor, DocumentConstants.PERMISSION_RESTORE)) {
                throw new DocumentNotFoundException();
            }
            return document;
        }

        UUID clubId = document.getClub().getId();
        UUID deptId = document.getDepartment() != null ? document.getDepartment().getId() : null;

        if (scope == DocumentScope.DEPARTMENT) {
            authorizationService.require(actor, DocumentConstants.PERMISSION_VIEW, clubId, deptId);
            boolean allowed = isClubOfficer(actor, clubId) || allowedDepartmentIds(actor, clubId).contains(deptId);
            if (!allowed) {
                throw forbidden();
            }
        } else {
            authorizationService.require(actor, DocumentConstants.PERMISSION_VIEW, clubId, null);
            if (document.getVisibility() == DocumentVisibility.OFFICERS && !isClubOfficer(actor, clubId)) {
                throw forbidden();
            }
        }

        if (document.isDeleted()
                && !authorizationService.hasPermission(actor, DocumentConstants.PERMISSION_RESTORE, clubId, null)) {
            throw new DocumentNotFoundException();
        }
        return document;
    }

    public void requireUploadVersion(Actor actor, Document document) {
        if (document.getScope() == DocumentScope.SYSTEM) {
            authorizationService.require(actor, DocumentConstants.PERMISSION_UPLOAD, null, null);
            return;
        }
        UUID clubId = document.getClub().getId();
        UUID deptId = document.getDepartment() != null ? document.getDepartment().getId() : null;
        authorizationService.require(actor, DocumentConstants.PERMISSION_UPLOAD, clubId, deptId);
    }

    public void requireUpdateOrOwner(Actor actor, Document document) {
        if (document.getScope() == DocumentScope.SYSTEM) {
            authorizationService.require(actor, DocumentConstants.PERMISSION_UPDATE, null, null);
            return;
        }
        if (isOwner(actor, document)) return;
        UUID clubId = document.getClub().getId();
        UUID deptId = document.getDepartment() != null ? document.getDepartment().getId() : null;
        authorizationService.require(actor, DocumentConstants.PERMISSION_UPDATE, clubId, deptId);
    }

    public void requireVisibilityChange(Actor actor, Document document) {
        if (document.getScope() == DocumentScope.SYSTEM) {
            authorizationService.require(actor, DocumentConstants.PERMISSION_UPDATE, null, null);
            return;
        }
        UUID clubId = document.getClub().getId();
        UUID deptId = document.getDepartment() != null ? document.getDepartment().getId() : null;
        authorizationService.require(actor, DocumentConstants.PERMISSION_UPDATE, clubId, deptId);
    }

    public void requireDeleteOrOwner(Actor actor, Document document) {
        if (document.getScope() == DocumentScope.SYSTEM) {
            authorizationService.require(actor, DocumentConstants.PERMISSION_DELETE, null, null);
            return;
        }
        if (isOwner(actor, document)) return;
        authorizationService.require(actor, DocumentConstants.PERMISSION_DELETE, document.getClub().getId(), null);
    }

    public void requireRestore(Actor actor, Document document) {
        UUID clubId = document.getScope() == DocumentScope.SYSTEM ? null : document.getClub().getId();
        authorizationService.require(actor, DocumentConstants.PERMISSION_RESTORE, clubId, null);
    }

    public DocumentVisibility validateAndAuthorizeVisibility(Actor actor, DocumentScope scope, UUID clubId, DocumentVisibility requested) {
        DocumentVisibility resolved = validateVisibility(scope, requested);
        if (scope == DocumentScope.CLUB && resolved == DocumentVisibility.OFFICERS && !isClubOfficer(actor, clubId)) {
            throw forbidden();
        }
        return resolved;
    }

    public DocumentVisibility validateVisibility(DocumentScope scope, DocumentVisibility requested) {
        return switch (scope) {
            case SYSTEM -> {
                DocumentVisibility v = requested != null ? requested : DocumentVisibility.PUBLIC_INTERNAL;
                if (v != DocumentVisibility.PUBLIC_INTERNAL && v != DocumentVisibility.OFFICERS) {
                    throw invalidVisibility("System documents support PUBLIC_INTERNAL or OFFICERS visibility");
                }
                yield v;
            }
            case CLUB -> {
                DocumentVisibility v = requested != null ? requested : DocumentVisibility.MEMBERS;
                if (v != DocumentVisibility.MEMBERS && v != DocumentVisibility.OFFICERS) {
                    throw invalidVisibility("Club documents support MEMBERS or OFFICERS visibility");
                }
                yield v;
            }
            case DEPARTMENT -> {
                if (requested != null && requested != DocumentVisibility.DEPARTMENT_ONLY) {
                    throw invalidVisibility("Department documents must use DEPARTMENT_ONLY visibility");
                }
                yield DocumentVisibility.DEPARTMENT_ONLY;
            }
        };
    }

    private static boolean isOwner(Actor actor, Document document) {
        return Objects.equals(document.getOwner().getId(), actor.id());
    }

    private static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }

    private static ApiException invalidVisibility(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }
}
