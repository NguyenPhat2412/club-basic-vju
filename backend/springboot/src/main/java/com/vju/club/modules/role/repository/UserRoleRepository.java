package com.vju.club.modules.role.repository;

import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.role.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {
    @Query("SELECT ur FROM UserRole ur JOIN FETCH ur.role WHERE ur.user.id = :userId AND ur.revokedAt IS NULL "
            + "ORDER BY ur.grantedAt DESC")
    List<UserRole> findActiveByUser(@Param("userId") UUID userId);

    @Query("SELECT count(ur) > 0 FROM UserRole ur WHERE ur.user.id = :userId AND ur.role.id = :roleId "
            + "AND ur.scope = :scope AND ur.revokedAt IS NULL "
            + "AND ((:clubId IS NULL AND ur.club IS NULL) OR ur.club.id = :clubId) "
            + "AND ((:departmentId IS NULL AND ur.department IS NULL) OR ur.department.id = :departmentId)")
    boolean existsActive(@Param("userId") UUID userId, @Param("roleId") UUID roleId, @Param("scope") PermissionScope scope,
                         @Param("clubId") UUID clubId, @Param("departmentId") UUID departmentId);

    Optional<UserRole> findByIdAndUser_Id(UUID id, UUID userId);

    @Query("SELECT ur FROM UserRole ur JOIN FETCH ur.role r JOIN FETCH ur.user u LEFT JOIN FETCH ur.department d "
            + "WHERE ur.revokedAt IS NULL AND r.active = true AND r.maxHolders IS NOT NULL "
            + "AND ((ur.scope = com.vju.club.modules.permission.enums.PermissionScope.CLUB AND ur.club.id = :clubId) "
            + "OR (ur.scope = com.vju.club.modules.permission.enums.PermissionScope.DEPARTMENT AND d.club.id = :clubId)) "
            + "ORDER BY ur.grantedAt ASC, ur.id ASC")
    List<UserRole> findActiveLeadershipInClub(@Param("clubId") UUID clubId);

    @Query("SELECT ur FROM UserRole ur JOIN FETCH ur.role JOIN FETCH ur.user WHERE ur.role.id = :roleId "
            + "AND ur.scope = :scope AND ur.revokedAt IS NULL "
            + "AND ((:clubId IS NULL AND ur.club IS NULL) OR ur.club.id = :clubId) "
            + "AND ((:departmentId IS NULL AND ur.department IS NULL) OR ur.department.id = :departmentId) "
            + "ORDER BY ur.grantedAt ASC, ur.id ASC")
    List<UserRole> findActiveHoldersForTarget(@Param("roleId") UUID roleId,
                                              @Param("scope") PermissionScope scope,
                                              @Param("clubId") UUID clubId,
                                              @Param("departmentId") UUID departmentId);

    @Query("SELECT ur FROM UserRole ur JOIN FETCH ur.role JOIN FETCH ur.user LEFT JOIN FETCH ur.club c LEFT JOIN FETCH ur.department d "
            + "WHERE ur.id = :assignmentId AND ur.revokedAt IS NULL "
            + "AND (c.id = :clubId OR d.club.id = :clubId)")
    Optional<UserRole> findActiveInClub(@Param("assignmentId") UUID assignmentId, @Param("clubId") UUID clubId);

    boolean existsByUser_IdAndRole_IdAndScopeAndRevokedAtIsNull(UUID userId, UUID roleId, PermissionScope scope);

    @Query("SELECT count(ur) > 0 FROM UserRole ur WHERE ur.user.id = :userId AND ur.role.code = :roleCode "
            + "AND ur.role.active = true AND ur.revokedAt IS NULL")
    boolean holdsRole(@Param("userId") UUID userId, @Param("roleCode") String roleCode);

    @Query("SELECT count(DISTINCT ur.user.id) FROM UserRole ur WHERE ur.role.code = :roleCode "
            + "AND ur.role.active = true AND ur.revokedAt IS NULL "
            + "AND ur.user.status = com.vju.club.modules.user.enums.UserStatus.ACTIVE")
    long countActiveHolders(@Param("roleCode") String roleCode);

    @Modifying(flushAutomatically = true)
    @Query(value = "UPDATE user_roles SET revoked_at = :now, revoked_by = :actorId WHERE user_id = :userId "
            + "AND revoked_at IS NULL AND (club_id = :clubId "
            + "OR department_id IN (SELECT d.id FROM departments d WHERE d.club_id = :clubId))", nativeQuery = true)
    int revokeAllInClub(@Param("userId") UUID userId, @Param("clubId") UUID clubId,
                        @Param("actorId") UUID actorId, @Param("now") OffsetDateTime now);

    @Modifying(flushAutomatically = true)
    @Query(value = "INSERT INTO user_roles (user_id, role_id, scope, club_id, granted_by) "
            + "SELECT :userId, r.id, 'CLUB', :clubId, :actorId FROM roles r WHERE r.granted_on_join AND r.active "
            + "AND r.scope = 'CLUB' "
            + "AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = :userId AND ur.role_id = r.id "
            + "AND ur.scope = 'CLUB' AND ur.club_id = :clubId AND ur.revoked_at IS NULL)", nativeQuery = true)
    int grantJoinRoles(@Param("userId") UUID userId, @Param("clubId") UUID clubId, @Param("actorId") UUID actorId);

    @Modifying(flushAutomatically = true)
    @Query(value = "UPDATE user_roles SET revoked_at = :now, revoked_by = :actorId WHERE user_id = :userId "
            + "AND club_id = :clubId AND scope = 'CLUB' AND revoked_at IS NULL "
            + "AND role_id IN (SELECT r.id FROM roles r WHERE r.granted_on_join)", nativeQuery = true)
    int revokeJoinRoles(@Param("userId") UUID userId, @Param("clubId") UUID clubId,
                         @Param("actorId") UUID actorId, @Param("now") OffsetDateTime now);
}
