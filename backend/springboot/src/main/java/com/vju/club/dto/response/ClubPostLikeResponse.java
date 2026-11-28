package com.vju.club.dto.response;

import java.util.UUID;

public record ClubPostLikeResponse(
        UUID postId,
        boolean liked,
        int likesCount) {
}
