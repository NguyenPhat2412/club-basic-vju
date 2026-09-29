package com.vju.club.auth.dto;

public record AuthResponse(UserResponse user, TokenResponse tokens) { }
