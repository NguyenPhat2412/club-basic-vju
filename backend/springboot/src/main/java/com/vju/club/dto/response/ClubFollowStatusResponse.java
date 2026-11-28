package com.vju.club.dto.response;

import java.util.UUID;

public record ClubFollowStatusResponse(
        UUID clubId,
        boolean following,
        long followersCount) {
}
