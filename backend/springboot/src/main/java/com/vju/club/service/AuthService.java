package com.vju.club.service;

import com.vju.club.dto.record.SignedIn;
import com.vju.club.dto.request.ChangePasswordRequest;
import com.vju.club.dto.request.GoogleLoginRequest;
import com.vju.club.dto.request.LoginRequest;
import com.vju.club.dto.response.GoogleSignInConfigResponse;
import com.vju.club.dto.response.UserResponse;

import java.util.UUID;

public interface AuthService {
    SignedIn login(LoginRequest request);

    SignedIn loginWithGoogle(GoogleLoginRequest request);

    GoogleSignInConfigResponse googleSignInConfig();

    UserResponse getCurrentUser(UUID userId);

    void changePassword(UUID userId, ChangePasswordRequest request, String currentSessionId);
}
