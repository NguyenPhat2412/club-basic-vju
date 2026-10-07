package com.vju.club.modules.role.repository;

import com.vju.club.modules.permission.entity.PermissionScope;
import com.vju.club.modules.role.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    boolean existsByUser_IdAndRole_IdAndScopeAndRevokedAtIsNull(UUID userId, UUID roleId, PermissionScope scope);
}
