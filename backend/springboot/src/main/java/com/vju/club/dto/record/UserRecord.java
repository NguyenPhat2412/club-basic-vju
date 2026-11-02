package com.vju.club.dto.record;

import com.vju.club.enums.UserStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserRecord(
        UUID id,
        String email,
        String fullName,
        String studentCode,
        String phone,
        String avatarUrl,
        UserStatus status,
        boolean requiresPasswordChange,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
