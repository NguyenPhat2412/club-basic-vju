package com.vju.club.modules.event.entity;

import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.event.enums.EventStatus;
import com.vju.club.modules.event.enums.EventType;
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
@Table(name = "events")
@Getter
@Setter
public class Event extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false, updatable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 32)
    private EventType eventType = EventType.CLUB_EVENT;

    @Column(length = 300)
    private String location;

    @Column(name = "start_time", nullable = false)
    private OffsetDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private OffsetDateTime endTime;

    @Column(name = "registration_deadline", nullable = false)
    private OffsetDateTime registrationDeadline;

    @Column(name = "allow_ctv", nullable = false)
    private boolean allowCtv;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EventStatus status = EventStatus.DRAFT;
}
