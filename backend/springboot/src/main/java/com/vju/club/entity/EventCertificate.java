package com.vju.club.entity;

import com.vju.club.enums.CertificateStatus;
import com.vju.club.enums.EventParticipantType;
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
import java.util.UUID;

@Entity
@Table(name = "event_certificates")
@Getter
@Setter
public class EventCertificate extends BaseEntity {
    @Column(name = "certificate_code", nullable = false, unique = true, length = 64)
    private String certificateCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false, updatable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false, updatable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "participant_type", nullable = false, length = 24)
    private EventParticipantType participantType;

    @Column(name = "event_role", length = 120)
    private String eventRole;

    @Column(name = "academic_term", length = 16)
    private String academicTerm;

    @Column(name = "recipient_name", nullable = false, length = 200)
    private String recipientName;

    @Column(name = "student_code", length = 32)
    private String studentCode;

    @Column(name = "club_code", nullable = false, length = 32)
    private String clubCode;

    @Column(name = "club_name", nullable = false, length = 200)
    private String clubName;

    @Column(name = "event_title", nullable = false, length = 255)
    private String eventTitle;

    @Column(name = "event_start_time", nullable = false)
    private OffsetDateTime eventStartTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private CertificateStatus status = CertificateStatus.ISSUED;

    @Column(name = "verification_sha256", nullable = false, length = 64)
    private String verificationSha256;

    @Column(name = "issued_by", nullable = false)
    private UUID issuedBy;

    @Column(name = "issued_at", nullable = false)
    private OffsetDateTime issuedAt;

    @Column(name = "revoked_by")
    private UUID revokedBy;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Column(name = "revocation_reason", length = 500)
    private String revocationReason;

    @Column(name = "template_image_url", length = 500)
    private String templateImageUrl;

    @Column(name = "acknowledged_at")
    private OffsetDateTime acknowledgedAt;

    @Column(name = "reminded_at")
    private OffsetDateTime remindedAt;

    @Column(name = "reminder_count", nullable = false)
    private int reminderCount;
}
