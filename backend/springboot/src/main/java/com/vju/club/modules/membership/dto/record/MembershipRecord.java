package com.vju.club.modules.membership.dto.record;

import com.vju.club.modules.membership.enums.MembershipStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MembershipRecord(
        UUID id,
        UUID userId,
        UUID clubId,
        MembershipStatus status,
        OffsetDateTime joinedAt,
        OffsetDateTime leftAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
