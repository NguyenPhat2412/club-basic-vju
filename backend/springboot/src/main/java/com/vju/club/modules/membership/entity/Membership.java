package com.vju.club.modules.membership.entity;

import lombok.Setter;
import lombok.Getter;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.club.entity.Club;
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
@Table(name = "memberships")
@Getter
@Setter
public class Membership extends TimestampedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MembershipStatus status = MembershipStatus.ACTIVE;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt;

    @Column(name = "left_at")
    private OffsetDateTime leftAt;
}
