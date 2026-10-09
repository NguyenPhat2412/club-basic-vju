package com.vju.club.modules.role.entity;

import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.enums.PermissionScope;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

import java.util.LinkedHashSet;
import java.util.Set;

/** A named bundle of permissions, e.g. a club position such as president or department head. */
@Entity
@Table(name = "roles")
public class Role extends TimestampedEntity {

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    private String description;

    /** Narrowest scope the role can be assigned at; it may only bundle permissions of this scope or narrower. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PermissionScope scope;

    /** Seeded roles cannot be edited through the API. */
    @Column(nullable = false)
    private boolean system;

    @Column(nullable = false)
    private boolean active = true;

    @ManyToMany
    @JoinTable(name = "role_permissions",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id"))
    private Set<Permission> permissions = new LinkedHashSet<>();

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public PermissionScope getScope() { return scope; }
    public void setScope(PermissionScope scope) { this.scope = scope; }
    public boolean isSystem() { return system; }
    public void setSystem(boolean system) { this.system = system; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Set<Permission> getPermissions() { return permissions; }
    public void setPermissions(Set<Permission> permissions) { this.permissions = permissions; }
}
