package com.vju.club.modules.auth.controller;

import com.vju.club.modules.auth.annotation.PublicEndpoint;
import lombok.RequiredArgsConstructor;
import com.vju.club.modules.auth.service.AuthService;

import com.vju.club.security.Actor;
import com.vju.club.security.SessionSignIn;
import com.vju.club.modules.auth.dto.response.AuthResponse;
import com.vju.club.modules.auth.dto.request.LoginRequest;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.modules.auth.dto.request.ChangePasswordRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
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
    private final SessionSignIn sessionSignIn;

    @PublicEndpoint(reason = "Handing the browser its CSRF cookie before the first POST")
    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }

    @PublicEndpoint(reason = "Starting a session")
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest body,
                              HttpServletRequest request, HttpServletResponse response) {
        AuthService.SignedIn signedIn = authService.login(body);
        sessionSignIn.signIn(signedIn.principal(), request, response);
        return signedIn.response();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(Actor actor, HttpSession session,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(actor.id(), request, session.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserResponse me(Actor actor) {
        return authService.getCurrentUser(actor.id());
    }
}
