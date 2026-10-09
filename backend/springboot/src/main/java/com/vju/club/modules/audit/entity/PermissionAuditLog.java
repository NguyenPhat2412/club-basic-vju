package com.vju.club.modules.audit.entity;

import com.vju.club.modules.audit.enums.PermissionAuditAction;
import com.vju.club.common.entity.CreatedEntity;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.user.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "permission_audit_logs")
public class PermissionAuditLog extends CreatedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_user_id", nullable = false)
    private User actorUser;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_user_id", nullable = false)
    private User targetUser;

    /** Exactly one of permission / role is set: the audited grant is either a permission or a role. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id")
    private Permission permission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PermissionAuditAction action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PermissionScope scope = PermissionScope.GLOBAL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id")
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    private String reason;

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public User getActorUser() { return actorUser; }
    public void setActorUser(User actorUser) { this.actorUser = actorUser; }
    public User getTargetUser() { return targetUser; }
    public void setTargetUser(User targetUser) { this.targetUser = targetUser; }
    public Permission getPermission() { return permission; }
    public void setPermission(Permission permission) { this.permission = permission; }
    public PermissionAuditAction getAction() { return action; }
    public void setAction(PermissionAuditAction action) { this.action = action; }
    public PermissionScope getScope() { return scope; }
    public void setScope(PermissionScope scope) { this.scope = scope; }
    public Club getClub() { return club; }
    public void setClub(Club club) { this.club = club; }
    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
