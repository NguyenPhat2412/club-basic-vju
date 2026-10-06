package com.vju.club.modules.role.repository;

import com.vju.club.modules.role.entity.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {

    @EntityGraph(attributePaths = "permissions")
    @Query("SELECT r FROM Role r ORDER BY r.system DESC, r.code ASC")
    List<Role> findAllWithPermissions();

    @EntityGraph(attributePaths = "permissions")
    @Query("SELECT r FROM Role r WHERE r.id = :id")
    Optional<Role> findWithPermissions(@Param("id") UUID id);

    Optional<Role> findByCode(String code);

    @Query("SELECT count(r) > 0 FROM Role r WHERE lower(r.code) = lower(:code)")
    boolean existsByCodeIgnoreCase(@Param("code") String code);
}
