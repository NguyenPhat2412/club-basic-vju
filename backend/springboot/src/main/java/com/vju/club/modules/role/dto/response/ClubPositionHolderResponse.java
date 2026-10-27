package com.vju.club.modules.role.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubPositionHolderResponse(
        UUID assignmentId,
        UUID userId,
        String fullName,
        String email,
        String studentCode,
        String avatarUrl,
        OffsetDateTime grantedAt
) { }
