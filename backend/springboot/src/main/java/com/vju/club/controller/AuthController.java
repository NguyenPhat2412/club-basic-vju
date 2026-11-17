package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.record.SignedIn;
import com.vju.club.dto.request.ChangePasswordRequest;
import com.vju.club.dto.request.ForgotPasswordRequest;
import com.vju.club.dto.request.GoogleLoginRequest;
import com.vju.club.dto.request.LoginRequest;
import com.vju.club.dto.request.RegisterRequest;
import com.vju.club.dto.request.ResetPasswordWithOtpRequest;
import com.vju.club.dto.response.AuthResponse;
import com.vju.club.dto.response.ForgotPasswordOtpResponse;
import com.vju.club.dto.response.GoogleSignInConfigResponse;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.security.Actor;
import com.vju.club.security.SessionSignIn;
import com.vju.club.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final SessionSignIn sessionSignIn;

    @PublicEndpoint(reason = "Handing the browser its CSRF cookie before the first POST")
    @GetMapping(ApiPaths.AUTH_CSRF)
    public ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }

    @PublicEndpoint(reason = "Starting a session")
    @PostMapping(ApiPaths.AUTH_LOGIN)
    public AuthResponse login(@Valid @RequestBody LoginRequest body,
                              HttpServletRequest request, HttpServletResponse response) {
        SignedIn signedIn = authService.login(body);
        sessionSignIn.signIn(signedIn.principal(), request, response);
        return signedIn.response();
    }

    @PublicEndpoint(reason = "Self-registering a student or member account and starting a session")
    @PostMapping(ApiPaths.AUTH_REGISTER)
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest body,
                                 HttpServletRequest request, HttpServletResponse response) {
        SignedIn signedIn = authService.register(body);
        sessionSignIn.signIn(signedIn.principal(), request, response);
        return signedIn.response();
    }

    @PublicEndpoint(reason = "Starting a session with a school Google account")
    @PostMapping(ApiPaths.AUTH_GOOGLE)
    public AuthResponse loginWithGoogle(@Valid @RequestBody GoogleLoginRequest body,
                                        HttpServletRequest request, HttpServletResponse response) {
        SignedIn signedIn = authService.loginWithGoogle(body);
        sessionSignIn.signIn(signedIn.principal(), request, response);
        return signedIn.response();
    }

    @PublicEndpoint(reason = "The login page decides whether to show the Google button")
    @GetMapping(ApiPaths.AUTH_GOOGLE_CONFIG)
    public GoogleSignInConfigResponse googleSignInConfig() {
        return authService.googleSignInConfig();
    }

    @PublicEndpoint(reason = "Requesting a 6-digit OTP password reset code before sign-in")
    @PostMapping(ApiPaths.AUTH_FORGOT_PASSWORD)
    public ForgotPasswordOtpResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest body) {
        return authService.requestPasswordReset(body);
    }

    @PublicEndpoint(reason = "Verifying a 6-digit OTP and setting a new password before sign-in")
    @PostMapping(ApiPaths.AUTH_RESET_PASSWORD)
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordWithOtpRequest body) {
        authService.resetPasswordWithOtp(body);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(ApiPaths.AUTH_CHANGE_PASSWORD)
    public ResponseEntity<Void> changePassword(Actor actor, HttpSession session,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(actor.id(), request, session.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping(ApiPaths.AUTH_ME)
    public UserResponse me(Actor actor) {
        return authService.getCurrentUser(actor.id());
    }
}
