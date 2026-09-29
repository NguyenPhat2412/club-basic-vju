package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.OffsetDateTime;

@Entity
@Table(name = "department_members", uniqueConstraints = @UniqueConstraint(name = "uq_department_members_assignment", columnNames = {"department_id", "membership_id"}))
public class DepartmentMember extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membership_id", nullable = false)
    private Membership membership;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    public Department getDepartment() { return department; }
    public void setDepartment(Department department) { this.department = department; }
    public Membership getMembership() { return membership; }
    public void setMembership(Membership membership) { this.membership = membership; }
    public OffsetDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(OffsetDateTime joinedAt) { this.joinedAt = joinedAt; }
}
