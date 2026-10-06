package com.vju.club.modules.department.service;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.entity.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.department.config.request.DepartmentPatchRequest;
import com.vju.club.modules.department.config.request.DepartmentRequest;
import com.vju.club.modules.department.config.response.DepartmentResponse;
import com.vju.club.modules.department.config.request.DepartmentStatusRequest;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.entity.ClubStatus;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.entity.DepartmentStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

public interface DepartmentService {

    PageResponse<DepartmentResponse> list(Actor actor, UUID clubId, int offset, int limit);

    DepartmentResponse get(Actor actor, UUID departmentId);

    DepartmentResponse create(Actor actor, UUID clubId, DepartmentRequest request);

    DepartmentResponse update(Actor actor, UUID departmentId, DepartmentPatchRequest request);

    DepartmentResponse updateStatus(Actor actor, UUID departmentId, DepartmentStatusRequest request);

}
