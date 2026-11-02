package com.vju.club.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.enums.AuditAction;
import com.vju.club.service.AuditService;
import com.vju.club.entity.Club;
import com.vju.club.enums.ClubStatus;
import com.vju.club.repository.ClubRepository;
import com.vju.club.common.DepartmentConstants;
import com.vju.club.dto.request.DepartmentPatchRequest;
import com.vju.club.dto.request.DepartmentRequest;
import com.vju.club.dto.request.DepartmentStatusRequest;
import com.vju.club.dto.response.DepartmentResponse;
import com.vju.club.entity.Department;
import com.vju.club.enums.DepartmentStatus;
import com.vju.club.mapper.DepartmentMapper;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.service.DepartmentService;
import com.vju.club.annotation.RequirePermission;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl implements DepartmentService {
    private final DepartmentRepository departmentRepository;
    private final ClubRepository clubRepository;
    private final AuditService auditService;
    private final PermissionAuthorizationService authorizationService;
    private final DepartmentMapper departmentMapper;

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(value = DepartmentConstants.PERMISSION_VIEW, clubId = "clubId")
    public PageResponse<DepartmentResponse> list(Actor actor, UUID clubId, int offset, int limit) {
        if (!clubRepository.existsById(clubId)) throw notFound("CLUB_NOT_FOUND", "Club not found");
        var items = departmentRepository.findByClub_IdOrderByNameAscIdAsc(clubId, new OffsetLimitRequest(offset, limit)).stream().map(departmentMapper::toResponse).toList();
        return new PageResponse<>(items, departmentRepository.countByClub_Id(clubId), offset, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentResponse get(Actor actor, UUID departmentId) {
        return departmentMapper.toResponse(authorize(actor, DepartmentConstants.PERMISSION_VIEW, departmentId));
    }

    @Override
    @Transactional
    @RequirePermission(value = DepartmentConstants.PERMISSION_CREATE, clubId = "clubId")
    public DepartmentResponse create(Actor actor, UUID clubId, DepartmentRequest request) {
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
        return departmentMapper.toResponse(saved);
    }

    @Override
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
        return departmentMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public DepartmentResponse updateStatus(Actor actor, UUID departmentId, DepartmentStatusRequest request) {
        String permission = request.status() == DepartmentStatus.ACTIVE
                ? DepartmentConstants.PERMISSION_ACTIVATE : DepartmentConstants.PERMISSION_INACTIVE;
        Department department = authorize(actor, permission, departmentId);
        Map<String, Object> before = Map.of("status", department.getStatus());
        department.setStatus(request.status());
        Department saved = departmentRepository.saveAndFlush(department);
        auditService.recordChange(actor.id(), request.status() == DepartmentStatus.ACTIVE
                ? AuditAction.DEPARTMENT_ACTIVATED : AuditAction.DEPARTMENT_DEACTIVATED, departmentId,
                saved.getClub().getId(), before, Map.of("status", saved.getStatus()));
        return departmentMapper.toResponse(saved);
    }

    private static Map<String, Object> snapshot(Department department) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", department.getName());
        values.put("description", department.getDescription());
        values.put("status", department.getStatus());
        return values;
    }

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
