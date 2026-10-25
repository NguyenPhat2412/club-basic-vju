package com.vju.club.modules.role.mapper;

import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.role.dto.response.RoleResponse;
import com.vju.club.modules.role.dto.response.UserRoleResponse;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.role.entity.UserRole;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Collection;
import java.util.List;

@Mapper
public interface RoleMapper {
    @Mapping(target = "permissionKeys", source = "permissions")
    RoleResponse toResponse(Role role);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "roleId", source = "role.id")
    @Mapping(target = "roleCode", source = "role.code")
    @Mapping(target = "roleName", source = "role.name")
    @Mapping(target = "clubId", source = "club.id")
    @Mapping(target = "departmentId", source = "department.id")
    UserRoleResponse toUserRoleResponse(UserRole assignment);

    default List<String> permissionKeys(Collection<Permission> permissions) {
        return permissions == null ? List.of()
                : permissions.stream().map(Permission::getPermissionKey).sorted().toList();
    }
}
