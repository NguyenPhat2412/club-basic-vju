package com.vju.club.modules.department.service.impl;

import com.vju.club.modules.department.service.DepartmentService;
import com.vju.club.modules.department.common.DepartmentConstants;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.department.dto.request.DepartmentPatchRequest;
import com.vju.club.modules.department.dto.request.DepartmentRequest;
import com.vju.club.modules.department.dto.response.DepartmentResponse;
import com.vju.club.modules.department.dto.request.DepartmentStatusRequest;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.enums.DepartmentStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class DepartmentServiceImpl implements DepartmentService {
    private final DepartmentRepository departmentRepository;
    private final AuditService auditService;
    private final ClubRepository clubRepository;
    private final PermissionAuthorizationService authorizationService;

    public DepartmentServiceImpl(DepartmentRepository departmentRepository,
                                 ClubRepository clubRepository, AuditService auditService, PermissionAuthorizationService authorizationService) {
        this.departmentRepository = departmentRepository;
        this.auditService = auditService;
        this.clubRepository = clubRepository;
        this.authorizationService = authorizationService;
    }

    @Transactional(readOnly = true)
    public PageResponse<DepartmentResponse> list(Actor actor, UUID clubId, int offset, int limit) {
        authorizationService.require(actor, DepartmentConstants.PERMISSION_VIEW, clubId, null);
        if (!clubRepository.existsById(clubId)) throw notFound("CLUB_NOT_FOUND", "Club not found");
        var items = departmentRepository.findByClub_IdOrderByNameAscIdAsc(clubId, new OffsetLimitRequest(offset, limit)).stream().map(DepartmentResponse::from).toList();
        return new PageResponse<>(items, departmentRepository.countByClub_Id(clubId), offset, limit);
    }

    @Transactional(readOnly = true)
    public DepartmentResponse get(Actor actor, UUID departmentId) {
        return DepartmentResponse.from(authorize(actor, DepartmentConstants.PERMISSION_VIEW, departmentId));
    }

    @Transactional
    public DepartmentResponse create(Actor actor, UUID clubId, DepartmentRequest request) {
        authorizationService.require(actor, DepartmentConstants.PERMISSION_CREATE, clubId, null);
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        String name = request.name().trim();
        if (departmentRepository.existsByClub_IdAndNameIgnoreCase(clubId, name)) {
            throw nameTaken();
        }
        Department department = new Department();
        department.setClub(club);
        department.setName(name);
        department.setDescription(request.description());
        Department saved = departmentRepository.saveAndFlush(department);
        auditService.record(actor.id(), AuditAction.DEPARTMENT_CREATED, saved.getId(), clubId, null, snapshot(saved));
        return DepartmentResponse.from(saved);
    }

    @Transactional
    public DepartmentResponse update(Actor actor, UUID departmentId, DepartmentPatchRequest request) {
        Department department = authorize(actor, "department.update", departmentId);
        Map<String, Object> before = snapshot(department);
        if (request.name() != null) {
            String name = request.name().trim();
            if (name.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DEPARTMENT_NAME", "Department name cannot be blank");
            }
            if (!department.getName().equalsIgnoreCase(name)
                    && departmentRepository.existsByClub_IdAndNameIgnoreCase(department.getClub().getId(), name)) {
                throw nameTaken();
            }
            department.setName(name);
        }
        if (request.description() != null) department.setDescription(request.description());
        Department saved = departmentRepository.saveAndFlush(department);
        auditService.recordChange(actor.id(), AuditAction.DEPARTMENT_UPDATED, departmentId, saved.getClub().getId(),
                before, snapshot(saved));
        return DepartmentResponse.from(saved);
    }

    @Transactional
    public DepartmentResponse updateStatus(Actor actor, UUID departmentId, DepartmentStatusRequest request) {
        String permission = request.status() == DepartmentStatus.ACTIVE ? "department.activate" : "department.inactive";
        Department department = authorize(actor, permission, departmentId);
        Map<String, Object> before = Map.of("status", department.getStatus());
        department.setStatus(request.status());
        Department saved = departmentRepository.saveAndFlush(department);
        auditService.recordChange(actor.id(), request.status() == DepartmentStatus.ACTIVE
                ? AuditAction.DEPARTMENT_ACTIVATED : AuditAction.DEPARTMENT_DEACTIVATED, departmentId,
                saved.getClub().getId(), before, Map.of("status", saved.getStatus()));
        return DepartmentResponse.from(saved);
    }

    private static Map<String, Object> snapshot(Department department) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", department.getName());
        values.put("description", department.getDescription());
        values.put("status", department.getStatus());
        return values;
    }

    /** Checks the permission at department scope or at the scope of the department's club. */
    private Department authorize(Actor actor, String permissionKey, UUID departmentId) {
        Department department = departmentRepository.findById(departmentId).orElseThrow(() ->
                authorizationService.missingResource(actor, permissionKey,
                        notFound("DEPARTMENT_NOT_FOUND", "Department not found")));
        authorizationService.require(actor, permissionKey, department.getClub().getId(), department.getId());
        return department;
    }

    private ApiException nameTaken() {
        return new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_NAME_ALREADY_EXISTS", "Department name is already used");
    }

    private ApiException notFound(String code, String message) { return new ApiException(HttpStatus.NOT_FOUND, code, message); }
}
