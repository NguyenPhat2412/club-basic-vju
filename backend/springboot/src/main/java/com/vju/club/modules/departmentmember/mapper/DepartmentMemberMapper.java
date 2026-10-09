package com.vju.club.modules.departmentmember.mapper;

import com.vju.club.modules.departmentmember.dto.response.DepartmentMemberResponse;
import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface DepartmentMemberMapper {
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "membershipId", source = "membership.id")
    @Mapping(target = "userId", source = "membership.user.id")
    DepartmentMemberResponse toResponse(DepartmentMember member);
}
