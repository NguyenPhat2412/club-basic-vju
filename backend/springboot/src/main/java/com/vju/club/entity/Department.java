package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "departments", uniqueConstraints = @UniqueConstraint(name = "uq_departments_club_name", columnNames = {"club_id", "name"}))
public class Department extends TimestampedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Column(nullable = false, length = 200)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private DepartmentStatus status = DepartmentStatus.ACTIVE;

    public Club getClub() { return club; }
    public void setClub(Club club) { this.club = club; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public DepartmentStatus getStatus() { return status; }
    public void setStatus(DepartmentStatus status) { this.status = status; }
}
