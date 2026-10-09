package com.vju.club.modules.permission.entity;

import lombok.Setter;
import lombok.Getter;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.common.entity.BaseEntity;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
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
@Table(name = "user_permissions")
@Getter
public class UserPermission extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @Setter
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    @Setter
    private Permission permission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Setter
    private PermissionScope scope = PermissionScope.GLOBAL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "club_id")
    @Setter
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @Setter
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "granted_by", nullable = false)
    @Setter
    private User grantedBy;

    @Column(name = "granted_at", nullable = false)
    @Setter
    private OffsetDateTime grantedAt;

    @Column(name = "revoked_at")
    @Setter
    private OffsetDateTime revokedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revoked_by")
    private User revokedBy;

    public void revoke(OffsetDateTime at, User by) {
        this.revokedAt = at;
        this.revokedBy = by;
    }
}
