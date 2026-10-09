package com.vju.club.modules.auth.dto.response;

import java.time.Instant;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        Instant accessTokenExpiresAt,
        Instant refreshTokenExpiresAt
) { }
