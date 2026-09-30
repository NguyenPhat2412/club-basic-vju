package com.vju.club.auth;

import com.vju.club.auth.dto.AuthResponse;
import com.vju.club.auth.dto.LoginRequest;
import com.vju.club.auth.dto.RefreshTokenRequest;
import com.vju.club.auth.dto.RegisterRequest;
import com.vju.club.auth.dto.UserResponse;
import com.vju.club.auth.dto.ChangePasswordRequest;

import java.util.UUID;

public interface AuthService {
    UserResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refresh(RefreshTokenRequest request);
    void logout(String refreshToken);
    UserResponse getCurrentUser(UUID userId);
    void changePassword(UUID userId, ChangePasswordRequest request);
}
