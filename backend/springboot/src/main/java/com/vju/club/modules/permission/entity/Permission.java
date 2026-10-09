package com.vju.club.modules.permission.entity;

import lombok.Setter;
import lombok.Getter;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.common.entity.CreatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "permissions")
@Getter
@Setter
public class Permission extends CreatedEntity {

    @Column(name = "permission_key", nullable = false, unique = true, length = 120)
    private String permissionKey;

    @Column(nullable = false, length = 64)
    private String module;

    @Column(nullable = false, length = 64)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PermissionScope scope = PermissionScope.GLOBAL;

    private String description;

    @Column(nullable = false)
    private boolean active = true;
}
