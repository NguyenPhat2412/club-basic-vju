package com.vju.club.modules.permission.repository;

import com.vju.club.modules.permission.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByPermissionKey(String permissionKey);
    Optional<Permission> findByPermissionKeyAndActiveTrue(String permissionKey);
    List<Permission> findAllByActiveTrueOrderByModuleAscActionAsc();

    List<Permission> findByPermissionKeyIn(java.util.Collection<String> keys);
}
