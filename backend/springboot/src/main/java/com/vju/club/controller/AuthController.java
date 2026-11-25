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
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.UserMapper;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.ClubPrincipal;
import com.vju.club.security.SecurityIdentity;
import com.vju.club.security.SessionSignIn;
import com.vju.club.service.AuditService;
import com.vju.club.service.AuthService;
import com.vju.club.service.TwoFactorOtpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final SessionSignIn sessionSignIn;

    @Autowired(required = false)
    private TwoFactorOtpService twoFactorOtpService;
    @Autowired(required = false)
    private UserRepository userRepository;
    @Autowired(required = false)
    private PasswordEncoder passwordEncoder;
    @Autowired(required = false)
    private UserMapper userMapper;
    @Autowired(required = false)
    private AuditService auditService;

    public record TwoFactorSendRequest(
            @NotBlank @Size(max = 32) String purpose,
            @Size(max = 120) String actionContext,
            @Size(max = 320) String email,
            @Size(max = 128) String password,
            @Size(max = 4096) String credential
    ) {
        public TwoFactorSendRequest(String purpose, String actionContext, String email, String password) {
            this(purpose, actionContext, email, password, null);
        }
    }

    public record TwoFactorVerifyRequest(
            @NotBlank @Size(max = 32) String purpose,
            @Size(max = 120) String actionContext,
            @NotBlank @Size(max = 12) String otp,
            @Size(max = 320) String email,
            @Size(max = 128) String password,
            @Size(max = 4096) String credential
    ) {
        public TwoFactorVerifyRequest(String purpose, String actionContext, String otp, String email, String password) {
            this(purpose, actionContext, otp, email, password, null);
        }
    }

    public record SetTwoFactorRequest(
            @NotNull Boolean enabled,
            @Size(max = 12) String otpCode
    ) {
    }

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

    @PublicEndpoint(reason = "Sending a 6-digit 2FA OTP code for login or critical action")
    @PostMapping(ApiPaths.AUTH_TWO_FACTOR_SEND)
    public TwoFactorOtpService.OtpPolicyResult sendTwoFactorOtp(
            Authentication authentication,
            @Valid @RequestBody TwoFactorSendRequest body) {
        String purpose = body.purpose().trim();
        UUID userId = resolveTwoFactorUserId(authentication, purpose, body.email(), body.password(), body.credential());
        return twoFactorOtpService.sendOtp(userId, purpose, body.actionContext());
    }

    @PublicEndpoint(reason = "Verifying a 6-digit 2FA OTP code for login or critical action")
    @PostMapping(ApiPaths.AUTH_TWO_FACTOR_VERIFY)
    public ResponseEntity<?> verifyTwoFactorOtp(
            Authentication authentication,
            @Valid @RequestBody TwoFactorVerifyRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        String purpose = body.purpose().trim();
        if (TwoFactorOtpService.PURPOSE_CRITICAL_ACTION.equals(purpose)) {
            UUID userId = SecurityIdentity.currentUserId(authentication)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                            "Authentication is required"));
            TwoFactorOtpService.VerifyResult result = twoFactorOtpService.verifyOtp(
                    userId, purpose, body.actionContext(), body.otp());
            return ResponseEntity.ok(result);
        }
        if (TwoFactorOtpService.PURPOSE_LOGIN_2FA.equals(purpose)) {
            UUID userId = resolveTwoFactorUserId(authentication, purpose, body.email(), body.password(), body.credential());
            twoFactorOtpService.verifyOtp(userId, purpose, body.actionContext(), body.otp());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                            "Invalid credentials"));
            ClubPrincipal principal = new ClubPrincipal(user.getId(), user.getEmail(), null, true);
            sessionSignIn.signIn(principal, request, response);
            if (auditService != null) {
                auditService.record(user.getId(), AuditAction.USER_LOGGED_IN, user.getId(), null, null,
                        Map.of("email", user.getEmail(), "method", "2fa"));
            }
            return ResponseEntity.ok(new AuthResponse(userMapper.toResponse(user)));
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid 2FA purpose");
    }

    @PatchMapping(ApiPaths.USERS_ME_TWO_FACTOR)
    public UserResponse setMyTwoFactor(Actor actor, @Valid @RequestBody SetTwoFactorRequest body) {
        return twoFactorOtpService.setTwoFactorEnabled(actor.id(), body.enabled(), body.otpCode());
    }

    private UUID resolveTwoFactorUserId(
            Authentication authentication, String purpose, String email, String password, String credential) {
        if (TwoFactorOtpService.PURPOSE_CRITICAL_ACTION.equals(purpose)) {
            return SecurityIdentity.currentUserId(authentication)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                            "Authentication is required"));
        }
        if (!TwoFactorOtpService.PURPOSE_LOGIN_2FA.equals(purpose)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid 2FA purpose");
        }
        var current = SecurityIdentity.currentUserId(authentication);
        if (current.isPresent()) {
            return current.get();
        }
        if (credential != null && !credential.isBlank()) {
            return authService.resolveGoogleUserIdForTwoFactor(credential);
        }
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
        }
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account is locked");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
        }
        return user.getId();
    }
}
