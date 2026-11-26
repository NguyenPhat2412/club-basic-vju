package com.vju.club.entity;

import com.vju.club.enums.EventStatus;
import com.vju.club.enums.EventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

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

    @Column(name = "allow_public_attendees", nullable = false)
    private boolean allowPublicAttendees;

    @Column(name = "requires_submission", nullable = false)
    private boolean requiresSubmission;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EventStatus status = EventStatus.DRAFT;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "academic_term", length = 16)
    private String academicTerm;

    @Column(name = "attendance_locked_at")
    private OffsetDateTime attendanceLockedAt;

    @Column(name = "attendance_locked_by")
    private UUID attendanceLockedBy;

    @Column(name = "attendance_signature_sha256", length = 64)
    private String attendanceSignatureSha256;

    @Column(name = "certificate_template_url", length = 500)
    private String certificateTemplateUrl;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_event_id")
    private Event parentEvent;

    @Column(name = "booth_code", length = 32)
    private String boothCode;

    @Column(name = "venue_map_url", length = 500)
    private String venueMapUrl;

    @Column(name = "facebook_post_url", length = 500)
    private String facebookPostUrl;

    @Column(name = "recap_album_url", length = 500)
    private String recapAlbumUrl;

    @Column(name = "allow_shuttle_bus", nullable = false)
    private boolean allowShuttleBus;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "event_co_hosts",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    @org.hibernate.annotations.BatchSize(size = 50)
    private Set<Club> coHosts = new LinkedHashSet<>();
}
