package com.vju.club.department;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.department.dto.DepartmentPatchRequest;
import com.vju.club.department.dto.DepartmentRequest;
import com.vju.club.department.dto.DepartmentResponse;
import com.vju.club.department.dto.DepartmentStatusRequest;
import org.springframework.security.core.Authentication;

import java.util.UUID;

public interface DepartmentService {
    PageResponse<DepartmentResponse> list(Authentication authentication, UUID clubId, int offset, int limit);
    DepartmentResponse get(Authentication authentication, UUID departmentId);
    DepartmentResponse create(Authentication authentication, UUID clubId, DepartmentRequest request);
    DepartmentResponse update(Authentication authentication, UUID departmentId, DepartmentPatchRequest request);
    DepartmentResponse updateStatus(Authentication authentication, UUID departmentId, DepartmentStatusRequest request);
}
