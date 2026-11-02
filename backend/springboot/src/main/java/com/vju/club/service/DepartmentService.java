package com.vju.club.service;

import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.request.DepartmentPatchRequest;
import com.vju.club.dto.request.DepartmentRequest;
import com.vju.club.dto.request.DepartmentStatusRequest;
import com.vju.club.dto.response.DepartmentResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface DepartmentService {
    PageResponse<DepartmentResponse> list(Actor actor, UUID clubId, int offset, int limit);

    DepartmentResponse get(Actor actor, UUID departmentId);

    DepartmentResponse create(Actor actor, UUID clubId, DepartmentRequest request);

    DepartmentResponse update(Actor actor, UUID departmentId, DepartmentPatchRequest request);

    DepartmentResponse updateStatus(Actor actor, UUID departmentId, DepartmentStatusRequest request);
}
