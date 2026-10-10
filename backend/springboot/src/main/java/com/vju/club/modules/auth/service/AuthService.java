package com.vju.club.modules.auth.service;

import com.vju.club.modules.auth.dto.request.ChangePasswordRequest;
import com.vju.club.modules.auth.dto.request.LoginRequest;
import com.vju.club.modules.auth.dto.request.RegisterRequest;
import com.vju.club.modules.auth.dto.response.AuthResponse;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.security.ClubPrincipal;

import java.util.UUID;

public interface AuthService {
    UserResponse register(RegisterRequest request);

    SignedIn login(LoginRequest request);

    UserResponse getCurrentUser(UUID userId);

    void changePassword(UUID userId, ChangePasswordRequest request, String currentSessionId);

    record SignedIn(ClubPrincipal principal, AuthResponse response) { }
}
