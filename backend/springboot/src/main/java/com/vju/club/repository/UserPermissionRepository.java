package com.vju.club.repository;

import com.vju.club.entity.PermissionScope;
import com.vju.club.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;
import java.util.List;

public interface UserPermissionRepository extends JpaRepository<UserPermission, UUID> {
    boolean existsByUser_IdAndPermission_PermissionKeyAndPermission_ActiveTrueAndRevokedAtIsNull(
            UUID userId, String permissionKey);
    @Query("SELECT CASE WHEN COUNT(up) > 0 THEN true ELSE false END FROM UserPermission up "
            + "WHERE up.user.id = :userId AND up.permission.permissionKey = :permissionKey "
            + "AND up.permission.active = true AND up.scope = :scope AND up.revokedAt IS NULL")
    boolean existsGlobal(@Param("userId") UUID userId, @Param("permissionKey") String permissionKey,
                         @Param("scope") PermissionScope scope);

    @Query("SELECT CASE WHEN COUNT(up) > 0 THEN true ELSE false END FROM UserPermission up "
            + "WHERE up.user.id = :userId AND up.permission.permissionKey = :permissionKey "
            + "AND up.permission.active = true AND up.scope = :scope AND up.club.id = :clubId "
            + "AND up.revokedAt IS NULL")
    boolean existsForClub(@Param("userId") UUID userId, @Param("permissionKey") String permissionKey,
                          @Param("scope") PermissionScope scope, @Param("clubId") UUID clubId);

    @Query("SELECT CASE WHEN COUNT(up) > 0 THEN true ELSE false END FROM UserPermission up "
            + "WHERE up.user.id = :userId AND up.permission.permissionKey = :permissionKey "
            + "AND up.permission.active = true AND up.scope = :scope AND up.department.id = :departmentId "
            + "AND up.revokedAt IS NULL")
    boolean existsForDepartment(@Param("userId") UUID userId, @Param("permissionKey") String permissionKey,
                                @Param("scope") PermissionScope scope, @Param("departmentId") UUID departmentId);

    List<UserPermission> findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(
            UUID userId, UUID permissionId);

    List<UserPermission> findByUser_IdAndRevokedAtIsNullOrderByGrantedAtDesc(UUID userId);
}
