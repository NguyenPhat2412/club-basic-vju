package com.vju.club.mapper;

import com.vju.club.dto.record.DepartmentMemberRecord;
import com.vju.club.dto.response.DepartmentMemberResponse;
import com.vju.club.entity.DepartmentMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface DepartmentMemberMapper {
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "membershipId", source = "membership.id")
    @Mapping(target = "userId", source = "membership.user.id")
    DepartmentMemberResponse toResponse(DepartmentMember member);

    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "membershipId", source = "membership.id")
    @Mapping(target = "userId", source = "membership.user.id")
    DepartmentMemberRecord toRecord(DepartmentMember member);
}
