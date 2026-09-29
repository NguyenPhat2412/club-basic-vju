package com.vju.club.departmentmember;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.departmentmember.dto.AddDepartmentMemberRequest;
import com.vju.club.departmentmember.dto.DepartmentMemberResponse;
import com.vju.club.departmentmember.dto.MoveDepartmentMemberRequest;
import org.springframework.security.core.Authentication;

import java.util.UUID;

public interface DepartmentMemberService {
    PageResponse<DepartmentMemberResponse> list(Authentication authentication, UUID departmentId, int offset, int limit);
    DepartmentMemberResponse add(Authentication authentication, UUID departmentId, AddDepartmentMemberRequest request);
    void remove(Authentication authentication, UUID departmentId, UUID membershipId);
    DepartmentMemberResponse move(Authentication authentication, UUID departmentId, UUID membershipId, MoveDepartmentMemberRequest request);
}
