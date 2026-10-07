package com.vju.club.modules.auth.config.response;

import com.vju.club.modules.user.config.response.UserResponse;

public record AuthResponse(UserResponse user, TokenResponse tokens) { }
