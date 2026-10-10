package com.vju.club.modules.membership.mapper;

import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import com.vju.club.modules.membership.dto.response.MembershipDepartmentResponse;
import com.vju.club.modules.membership.dto.response.MembershipResponse;
import com.vju.club.modules.membership.dto.response.MyMembershipResponse;
import com.vju.club.modules.membership.entity.Membership;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper
public interface MembershipMapper {
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "clubId", source = "club.id")
    MembershipResponse toResponse(Membership membership);

    @Mapping(target = "id", source = "membership.id")
    @Mapping(target = "clubId", source = "membership.club.id")
    @Mapping(target = "clubCode", source = "membership.club.code")
    @Mapping(target = "clubName", source = "membership.club.name")
    @Mapping(target = "status", source = "membership.status")
    @Mapping(target = "joinedAt", source = "membership.joinedAt")
    @Mapping(target = "leftAt", source = "membership.leftAt")
    @Mapping(target = "createdAt", source = "membership.createdAt")
    @Mapping(target = "updatedAt", source = "membership.updatedAt")
    @Mapping(target = "departments", source = "departments")
    MyMembershipResponse toMyResponse(Membership membership, List<MembershipDepartmentResponse> departments);

    @Mapping(target = "id", source = "department.id")
    @Mapping(target = "name", source = "department.name")
    MembershipDepartmentResponse toDepartmentResponse(DepartmentMember assignment);
}
