package com.vju.club.modules.permission.entity;

import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.common.entity.CreatedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "permissions")
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

    public String getPermissionKey() { return permissionKey; }
    public void setPermissionKey(String permissionKey) { this.permissionKey = permissionKey; }
    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public PermissionScope getScope() { return scope; }
    public void setScope(PermissionScope scope) { this.scope = scope; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
