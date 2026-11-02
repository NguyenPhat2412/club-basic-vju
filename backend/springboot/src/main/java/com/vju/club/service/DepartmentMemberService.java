package com.vju.club.service;

import com.vju.club.dto.response.PageResponse;
import com.vju.club.dto.request.AddDepartmentMemberRequest;
import com.vju.club.dto.request.MoveDepartmentMemberRequest;
import com.vju.club.dto.response.DepartmentMemberResponse;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface DepartmentMemberService {
    PageResponse<DepartmentMemberResponse> list(Actor actor, UUID departmentId, int offset, int limit);

    DepartmentMemberResponse add(Actor actor, UUID departmentId, AddDepartmentMemberRequest request);

    void remove(Actor actor, UUID departmentId, UUID membershipId);

    DepartmentMemberResponse move(Actor actor, UUID departmentId, UUID membershipId, MoveDepartmentMemberRequest request);
}
