package com.vju.club.repository;

import com.vju.club.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Direct grants, plus the authorization checks. Checks read the {@code effective_user_permissions}
 * view, so a permission counts whether it was granted directly or through an active role.
 */
public interface UserPermissionRepository extends JpaRepository<UserPermission, UUID> {

    @Query(value = "SELECT EXISTS (SELECT 1 FROM effective_user_permissions e WHERE e.user_id = :userId "
            + "AND e.permission_key = :permissionKey AND e.scope = 'GLOBAL')", nativeQuery = true)
    boolean hasGlobal(@Param("userId") UUID userId, @Param("permissionKey") String permissionKey);

    @Query(value = "SELECT EXISTS (SELECT 1 FROM effective_user_permissions e WHERE e.user_id = :userId "
            + "AND e.permission_key = :permissionKey AND e.scope = 'CLUB' AND e.club_id = :clubId)", nativeQuery = true)
    boolean hasInClub(@Param("userId") UUID userId, @Param("permissionKey") String permissionKey,
                      @Param("clubId") UUID clubId);

    @Query(value = "SELECT EXISTS (SELECT 1 FROM effective_user_permissions e WHERE e.user_id = :userId "
            + "AND e.permission_key = :permissionKey AND e.scope = 'DEPARTMENT' AND e.department_id = :departmentId)",
            nativeQuery = true)
    boolean hasInDepartment(@Param("userId") UUID userId, @Param("permissionKey") String permissionKey,
                            @Param("departmentId") UUID departmentId);

    @Query(value = "SELECT EXISTS (SELECT 1 FROM effective_user_permissions e WHERE e.user_id = :userId "
            + "AND e.permission_key = :permissionKey)", nativeQuery = true)
    boolean hasAnywhere(@Param("userId") UUID userId, @Param("permissionKey") String permissionKey);

    @Query(value = "SELECT e.permission_key AS permissionKey, e.scope AS scope, e.club_id AS clubId, "
            + "e.department_id AS departmentId, e.source AS source, r.code AS roleCode "
            + "FROM effective_user_permissions e LEFT JOIN roles r ON r.id = e.role_id "
            + "WHERE e.user_id = :userId ORDER BY e.permission_key, e.scope, e.source, r.code", nativeQuery = true)
    List<EffectivePermissionRow> findEffective(@Param("userId") UUID userId);

    List<UserPermission> findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(
            UUID userId, UUID permissionId);

    List<UserPermission> findByUser_IdAndRevokedAtIsNullOrderByGrantedAtDesc(UUID userId);

    interface EffectivePermissionRow {
        String getPermissionKey();
        String getScope();
        UUID getClubId();
        UUID getDepartmentId();
        String getSource();
        String getRoleCode();
    }
}
