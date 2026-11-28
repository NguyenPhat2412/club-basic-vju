package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubPostResponse(
        UUID id,
        UUID clubId,
        String clubName,
        String clubCode,
        UUID authorId,
        String authorName,
        String authorAvatarUrl,
        String title,
        String content,
        String imageUrl,
        boolean pinned,
        int likesCount,
        boolean likedByMe,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
