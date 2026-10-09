package com.vju.club.auth;

import com.vju.club.modules.auth.service.AuthService;
import com.vju.club.modules.auth.service.JwtTokenService;

import com.vju.club.modules.auth.service.impl.AuthServiceImpl;

import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.auth.dto.request.ChangePasswordRequest;
import com.vju.club.modules.auth.dto.request.LoginRequest;
import com.vju.club.modules.auth.dto.request.RefreshTokenRequest;
import com.vju.club.modules.auth.dto.request.RegisterRequest;
import com.vju.club.config.JwtProperties;
import com.vju.club.modules.auth.entity.RefreshToken;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.auth.repository.RefreshTokenRepository;
import com.vju.club.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-30T00:00:00Z");
    private static final PasswordEncoder ENCODER = new BCryptPasswordEncoder(4);

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock AuthenticationManager authenticationManager;
    @Mock JwtTokenService tokenService;
    @Mock AuditService auditService;

    private AuthService service;
    private final JwtProperties properties = new JwtProperties();

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(userRepository, refreshTokenRepository, ENCODER,
                authenticationManager, tokenService, properties, Clock.fixed(NOW, ZoneOffset.UTC), auditService);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(refreshTokenRepository.saveAndFlush(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokenService.issueAccessToken(any(User.class)))
                .thenReturn(new JwtTokenService.AccessToken("access", NOW.plusSeconds(900)));
        when(tokenService.issueRefreshToken())
                .thenReturn(new JwtTokenService.RefreshTokenValue("new-refresh", "new-hash"));
    }

    private static User user(String email, String password, UserStatus status) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setFullName("Test User");
        user.setPasswordHash(ENCODER.encode(password));
        user.setStatus(status);
        return user;
    }

    private static RefreshToken refreshToken(User user, OffsetDateTime expiresAt, OffsetDateTime revokedAt) {
        RefreshToken token = new RefreshToken();
        token.setId(UUID.randomUUID());
        token.setUser(user);
        token.setTokenHash("hash");
        token.setExpiresAt(expiresAt);
        token.setRevokedAt(revokedAt);
        return token;
    }

    private static void assertApiError(Runnable call, HttpStatus status, String code) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.getStatus()).isEqualTo(status);
                    assertThat(error.getCode()).isEqualTo(code);
                });
    }

    @Nested
    class Register {
        @Test
        void hashesPasswordAndNormalizesInput() {
            service.register(new RegisterRequest("  USER@Example.com ", "password123", "  Test User ", " SV001 ", "  "));

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).saveAndFlush(captor.capture());
            User saved = captor.getValue();
            assertThat(saved.getEmail()).isEqualTo("user@example.com");
            assertThat(saved.getFullName()).isEqualTo("Test User");
            assertThat(saved.getStudentCode()).isEqualTo("SV001");
            assertThat(saved.getPhone()).isNull();
            assertThat(saved.getStatus()).isEqualTo(UserStatus.ACTIVE);
            assertThat(saved.getPasswordHash()).isNotEqualTo("password123");
            assertThat(ENCODER.matches("password123", saved.getPasswordHash())).isTrue();
        }

        @Test
        void rejectsDuplicateEmail() {
            when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(true);
            assertApiError(() -> service.register(new RegisterRequest("user@example.com", "password123", "Test", null, null)),
                    HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS");
            verify(userRepository, never()).saveAndFlush(any());
        }

        @Test
        void rejectsDuplicateStudentCode() {
            when(userRepository.existsByStudentCodeIgnoreCase("SV001")).thenReturn(true);
            assertApiError(() -> service.register(new RegisterRequest("new@example.com", "password123", "Test", "SV001", null)),
                    HttpStatus.CONFLICT, "STUDENT_CODE_ALREADY_EXISTS");
            verify(userRepository, never()).saveAndFlush(any());
        }

        @Test
        void blankStudentCodeIsStoredAsNullAndNotCheckedForDuplicates() {
            service.register(new RegisterRequest("a@example.com", "password123", "Test", "   ", null));
            verify(userRepository, never()).existsByStudentCodeIgnoreCase(any());
        }
    }

    @Nested
    class Login {
        @Test
        void issuesTokensAndPersistsHashedRefreshToken() {
            User user = user("user@example.com", "password123", UserStatus.ACTIVE);
            when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

            var response = service.login(new LoginRequest(" USER@example.com ", "password123"));

            assertThat(response.tokens().accessToken()).isEqualTo("access");
            assertThat(response.tokens().refreshToken()).isEqualTo("new-refresh");
            assertThat(response.tokens().refreshTokenExpiresAt()).isEqualTo(NOW.plus(properties.getRefreshTokenTtl()));
            ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
            verify(refreshTokenRepository).saveAndFlush(captor.capture());
            assertThat(captor.getValue().getTokenHash()).isEqualTo("new-hash");
            assertThat(captor.getValue().getUser()).isSameAs(user);
        }

        @Test
        void wrongPasswordIsInvalidCredentials() {
            when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
            when(userRepository.findByEmailIgnoreCase("user@example.com"))
                    .thenReturn(Optional.of(user("user@example.com", "password123", UserStatus.ACTIVE)));
            assertApiError(() -> service.login(new LoginRequest("user@example.com", "wrong")),
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        @Test
        void unknownEmailIsInvalidCredentials() {
            when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));
            when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
            assertApiError(() -> service.login(new LoginRequest("ghost@example.com", "password123")),
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        @Test
        void inactiveAccountWithWrongPasswordDoesNotRevealItsStatus() {
            when(authenticationManager.authenticate(any())).thenThrow(new DisabledException("disabled"));
            when(userRepository.findByEmailIgnoreCase("user@example.com"))
                    .thenReturn(Optional.of(user("user@example.com", "password123", UserStatus.INACTIVE)));
            assertApiError(() -> service.login(new LoginRequest("user@example.com", "wrong-password")),
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        @Test
        void inactiveAccountWithCorrectPasswordIsToldItIsInactive() {
            when(authenticationManager.authenticate(any())).thenThrow(new DisabledException("disabled"));
            when(userRepository.findByEmailIgnoreCase("user@example.com"))
                    .thenReturn(Optional.of(user("user@example.com", "password123", UserStatus.INACTIVE)));
            assertApiError(() -> service.login(new LoginRequest("user@example.com", "password123")),
                    HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE");
            verify(refreshTokenRepository, never()).saveAndFlush(any());
        }
    }

    @Nested
    class Refresh {
        private final User user = user("user@example.com", "password123", UserStatus.ACTIVE);
        private final OffsetDateTime now = OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC);

        @BeforeEach
        void hashing() {
            when(tokenService.hash("old-token")).thenReturn("hash");
        }

        @Test
        void revokesOldTokenAtomicallyAndIssuesReplacement() {
            RefreshToken existing = refreshToken(user, now.plusHours(1), null);
            when(refreshTokenRepository.findByTokenHash("hash")).thenReturn(Optional.of(existing));
            when(refreshTokenRepository.revokeIfActive(existing.getId(), now)).thenReturn(1);

            var response = service.refresh(new RefreshTokenRequest("old-token"));

            assertThat(response.tokens().refreshToken()).isEqualTo("new-refresh");
            verify(refreshTokenRepository).revokeIfActive(existing.getId(), now);
        }

        @Test
        void losingTheRotationRaceIsRejected() {
            RefreshToken existing = refreshToken(user, now.plusHours(1), null);
            when(refreshTokenRepository.findByTokenHash("hash")).thenReturn(Optional.of(existing));
            when(refreshTokenRepository.revokeIfActive(existing.getId(), now)).thenReturn(0);

            assertApiError(() -> service.refresh(new RefreshTokenRequest("old-token")),
                    HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
            verify(refreshTokenRepository, never()).saveAndFlush(any());
        }

        @Test
        void unknownTokenIsRejected() {
            when(refreshTokenRepository.findByTokenHash("hash")).thenReturn(Optional.empty());
            assertApiError(() -> service.refresh(new RefreshTokenRequest("old-token")),
                    HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
        }

        @Test
        void expiredTokenIsRejected() {
            when(refreshTokenRepository.findByTokenHash("hash"))
                    .thenReturn(Optional.of(refreshToken(user, now.minusSeconds(1), null)));
            assertApiError(() -> service.refresh(new RefreshTokenRequest("old-token")),
                    HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
            verify(refreshTokenRepository, never()).revokeIfActive(any(), any());
        }

        @Test
        void revokedTokenIsRejected() {
            when(refreshTokenRepository.findByTokenHash("hash"))
                    .thenReturn(Optional.of(refreshToken(user, now.plusHours(1), now.minusMinutes(5))));
            assertApiError(() -> service.refresh(new RefreshTokenRequest("old-token")),
                    HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
        }

        @Test
        void inactiveUserCannotRefresh() {
            user.setStatus(UserStatus.INACTIVE);
            when(refreshTokenRepository.findByTokenHash("hash"))
                    .thenReturn(Optional.of(refreshToken(user, now.plusHours(1), null)));
            assertApiError(() -> service.refresh(new RefreshTokenRequest("old-token")),
                    HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
        }
    }

    @Nested
    class LogoutAndPassword {
        @Test
        void logoutIgnoresBlankAndUnknownTokens() {
            service.logout(null);
            service.logout("  ");
            when(tokenService.hash("unknown")).thenReturn("h");
            when(refreshTokenRepository.findByTokenHash("h")).thenReturn(Optional.empty());
            service.logout("unknown");
            verify(refreshTokenRepository, never()).revokeIfActive(any(), any());
        }

        @Test
        void logoutRevokesKnownToken() {
            User user = user("user@example.com", "password123", UserStatus.ACTIVE);
            RefreshToken token = refreshToken(user, OffsetDateTime.ofInstant(NOW, ZoneOffset.UTC).plusDays(1), null);
            when(tokenService.hash("known")).thenReturn("hash");
            when(refreshTokenRepository.findByTokenHash("hash")).thenReturn(Optional.of(token));
            service.logout("known");
            verify(refreshTokenRepository).revokeIfActive(eq(token.getId()), any());
        }

        @Test
        void changePasswordRequiresCurrentPassword() {
            User user = user("user@example.com", "password123", UserStatus.ACTIVE);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
            assertApiError(() -> service.changePassword(user.getId(), new ChangePasswordRequest("wrong", "NewPassword1")),
                    HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_INVALID");
            verify(refreshTokenRepository, never()).revokeAllForUser(any(), any());
        }

        @Test
        void changePasswordStoresNewHashAndRevokesEverySession() {
            User user = user("user@example.com", "password123", UserStatus.ACTIVE);
            when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

            service.changePassword(user.getId(), new ChangePasswordRequest("password123", "NewPassword1"));

            assertThat(ENCODER.matches("NewPassword1", user.getPasswordHash())).isTrue();
            verify(refreshTokenRepository).revokeAllForUser(eq(user.getId()), any());
        }

        @Test
        void changePasswordForMissingUserIsNotFound() {
            UUID id = UUID.randomUUID();
            when(userRepository.findById(id)).thenReturn(Optional.empty());
            assertApiError(() -> service.changePassword(id, new ChangePasswordRequest("a", "NewPassword1")),
                    HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
        }
    }

    @Test
    void refreshTtlComesFromConfiguration() {
        properties.setRefreshTokenTtl(Duration.ofHours(2));
        User user = user("user@example.com", "password123", UserStatus.ACTIVE);
        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
        var response = service.login(new LoginRequest("user@example.com", "password123"));
        assertThat(response.tokens().refreshTokenExpiresAt()).isEqualTo(NOW.plus(Duration.ofHours(2)));
    }
}
