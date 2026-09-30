package com.vju.club.auth.dto;

import com.vju.club.user.dto.UserResponse;

public record AuthResponse(UserResponse user, TokenResponse tokens) { }
