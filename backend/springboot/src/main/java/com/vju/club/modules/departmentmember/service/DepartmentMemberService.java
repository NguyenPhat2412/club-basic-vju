package com.vju.club.modules.departmentmember.service;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.modules.departmentmember.dto.request.AddDepartmentMemberRequest;
import com.vju.club.modules.departmentmember.dto.response.DepartmentMemberResponse;
import com.vju.club.modules.departmentmember.dto.request.MoveDepartmentMemberRequest;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import com.vju.club.modules.department.enums.DepartmentStatus;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public interface DepartmentMemberService {

    PageResponse<DepartmentMemberResponse> list(Actor actor, UUID departmentId, int offset, int limit);

    DepartmentMemberResponse add(Actor actor, UUID departmentId, AddDepartmentMemberRequest request);

    void remove(Actor actor, UUID departmentId, UUID membershipId);

    DepartmentMemberResponse move(Actor actor, UUID departmentId, UUID membershipId, MoveDepartmentMemberRequest request);

}
