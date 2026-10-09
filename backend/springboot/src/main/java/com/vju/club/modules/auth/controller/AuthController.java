package com.vju.club.modules.auth.controller;

import com.vju.club.modules.auth.annotation.PublicEndpoint;
import lombok.RequiredArgsConstructor;
import com.vju.club.modules.auth.service.AuthService;

import com.vju.club.security.Actor;
import com.vju.club.modules.auth.dto.response.AuthResponse;
import com.vju.club.modules.auth.dto.request.LoginRequest;
import com.vju.club.modules.auth.dto.request.LogoutRequest;
import com.vju.club.modules.auth.dto.request.RefreshTokenRequest;
import com.vju.club.modules.auth.dto.request.RegisterRequest;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.modules.auth.dto.request.ChangePasswordRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PublicEndpoint(reason = "Self-service sign-up")
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PublicEndpoint(reason = "Obtaining tokens")
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PublicEndpoint(reason = "Renewing an expired access token")
    @PostMapping("/refresh-token")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(Actor actor,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(actor.id(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserResponse me(Actor actor) {
        return authService.getCurrentUser(actor.id());
    }
}
