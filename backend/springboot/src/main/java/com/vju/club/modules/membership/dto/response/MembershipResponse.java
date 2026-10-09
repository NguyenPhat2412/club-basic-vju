package com.vju.club.modules.membership.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record MembershipResponse(
        UUID id, UUID userId, UUID clubId, String status,
        OffsetDateTime joinedAt, OffsetDateTime leftAt, OffsetDateTime createdAt, OffsetDateTime updatedAt) { }
