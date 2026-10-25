package com.vju.club.modules.auth.service;

import com.vju.club.modules.auth.dto.record.SignedIn;
import com.vju.club.modules.auth.dto.request.ChangePasswordRequest;
import com.vju.club.modules.auth.dto.request.GoogleLoginRequest;
import com.vju.club.modules.auth.dto.request.LoginRequest;
import com.vju.club.modules.auth.dto.response.GoogleSignInConfigResponse;
import com.vju.club.modules.user.dto.response.UserResponse;

import java.util.UUID;

public interface AuthService {
    SignedIn login(LoginRequest request);

    SignedIn loginWithGoogle(GoogleLoginRequest request);

    GoogleSignInConfigResponse googleSignInConfig();

    UserResponse getCurrentUser(UUID userId);

    void changePassword(UUID userId, ChangePasswordRequest request, String currentSessionId);
}
