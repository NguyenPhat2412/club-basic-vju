package com.vju.club.modules.task.entity;

import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.event.entity.Event;
import com.vju.club.modules.task.enums.TaskPriority;
import com.vju.club.modules.task.enums.TaskStatus;
import com.vju.club.modules.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "tasks")
@Getter
@Setter
public class Task extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false, updatable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TaskStatus status = TaskStatus.TODO;

    @Column(name = "progress_percent", nullable = false)
    private int progressPercent;

    @Column(nullable = false)
    private OffsetDateTime deadline;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignee_id", nullable = false)
    private User assignee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assigner_id", nullable = false, updatable = false)
    private User assigner;

    @Column(name = "progress_note", length = 2000)
    private String progressNote;

    @Column(name = "report_link", length = 1000)
    private String reportLink;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private User verifiedBy;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;
}
