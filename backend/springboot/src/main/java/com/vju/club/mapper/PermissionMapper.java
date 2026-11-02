package com.vju.club.mapper;

import com.vju.club.dto.record.PermissionGrantRecord;
import com.vju.club.dto.response.EffectivePermissionResponse;
import com.vju.club.dto.response.PermissionResponse;
import com.vju.club.dto.response.UserPermissionResponse;
import com.vju.club.entity.Permission;
import com.vju.club.entity.UserPermission;
import com.vju.club.repository.UserPermissionRepository.EffectivePermissionRow;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface PermissionMapper {
    PermissionResponse toResponse(Permission permission);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "permissionId", source = "permission.id")
    @Mapping(target = "permissionKey", source = "permission.permissionKey")
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    UserPermissionResponse toUserPermissionResponse(UserPermission grant);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "permissionId", source = "permission.id")
    @Mapping(target = "permissionKey", source = "permission.permissionKey")
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    @Mapping(target = "grantedBy", source = "grantedBy.id")
    PermissionGrantRecord toGrantRecord(UserPermission grant);

    EffectivePermissionResponse toEffectiveResponse(EffectivePermissionRow row);
}
