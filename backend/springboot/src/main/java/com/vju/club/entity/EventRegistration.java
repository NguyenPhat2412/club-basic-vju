package com.vju.club.entity;

import com.vju.club.enums.EventParticipantType;
import com.vju.club.enums.EventRegistrationStatus;
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
@Table(name = "event_registrations")
@Getter
@Setter
public class EventRegistration extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false, updatable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "participant_type", nullable = false, length = 16)
    private EventParticipantType participantType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private EventRegistrationStatus status = EventRegistrationStatus.REGISTERED;

    @Column(name = "event_role", length = 100)
    private String eventRole;

    @Column(length = 500)
    private String note;

    @Column(name = "registered_at", nullable = false)
    private OffsetDateTime registeredAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;
}
