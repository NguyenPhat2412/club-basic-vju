package com.vju.club.modules.user.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record UserResponse(
        UUID id,
        String email,
        String fullName,
        String studentCode,
        String phone,
        String avatarUrl,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
