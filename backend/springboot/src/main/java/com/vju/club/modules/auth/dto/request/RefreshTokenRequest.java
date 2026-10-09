package com.vju.club.modules.auth.dto.request;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(@NotBlank @Size(max = 512) String refreshToken) { }
