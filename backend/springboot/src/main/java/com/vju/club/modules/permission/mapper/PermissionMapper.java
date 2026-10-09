package com.vju.club.modules.permission.mapper;

import com.vju.club.modules.permission.dto.response.EffectivePermissionResponse;
import com.vju.club.modules.permission.dto.response.PermissionResponse;
import com.vju.club.modules.permission.dto.response.UserPermissionResponse;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.entity.UserPermission;
import com.vju.club.modules.permission.repository.UserPermissionRepository.EffectivePermissionRow;
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

    EffectivePermissionResponse toEffectiveResponse(EffectivePermissionRow row);
}
