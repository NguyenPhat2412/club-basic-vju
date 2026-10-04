package com.vju.club.user.dto;

import com.vju.club.entity.User;

import java.time.OffsetDateTime;
import java.util.UUID;

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
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(), user.getEmail(), user.getFullName(), user.getStudentCode(),
                user.getPhone(), user.getAvatarUrl(), user.getStatus().name(),
                user.getCreatedAt(), user.getUpdatedAt());
    }
}
