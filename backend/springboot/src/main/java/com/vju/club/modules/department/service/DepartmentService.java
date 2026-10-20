package com.vju.club.modules.department.service;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.department.dto.request.DepartmentPatchRequest;
import com.vju.club.modules.department.dto.request.DepartmentRequest;
import com.vju.club.modules.department.dto.request.DepartmentStatusRequest;
import com.vju.club.modules.department.dto.response.DepartmentResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface DepartmentService {
    PageResponse<DepartmentResponse> list(Actor actor, UUID clubId, int offset, int limit);

    DepartmentResponse get(Actor actor, UUID departmentId);

    DepartmentResponse create(Actor actor, UUID clubId, DepartmentRequest request);

    DepartmentResponse update(Actor actor, UUID departmentId, DepartmentPatchRequest request);

    DepartmentResponse updateStatus(Actor actor, UUID departmentId, DepartmentStatusRequest request);
}
