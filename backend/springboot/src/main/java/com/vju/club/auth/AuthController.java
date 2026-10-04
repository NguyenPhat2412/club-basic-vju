package com.vju.club.auth;

import com.vju.club.security.Actor;
import com.vju.club.auth.dto.AuthResponse;
import com.vju.club.auth.dto.LoginRequest;
import com.vju.club.auth.dto.LogoutRequest;
import com.vju.club.auth.dto.RefreshTokenRequest;
import com.vju.club.auth.dto.RegisterRequest;
import com.vju.club.user.dto.UserResponse;
import com.vju.club.auth.dto.ChangePasswordRequest;
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
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

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
