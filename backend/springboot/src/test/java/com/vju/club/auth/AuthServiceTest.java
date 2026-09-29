package com.vju.club.auth;

import com.vju.club.auth.dto.LoginRequest;
import com.vju.club.auth.dto.RefreshTokenRequest;
import com.vju.club.auth.dto.RegisterRequest;
import com.vju.club.config.JwtProperties;
import com.vju.club.entity.RefreshToken;
import com.vju.club.entity.User;
import com.vju.club.error.ApiException;
import com.vju.club.repository.RefreshTokenRepository;
import com.vju.club.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock AuthenticationManager authenticationManager;
    @Mock JwtTokenService tokenService;

    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        service = new AuthServiceImpl(
                userRepository,
                refreshTokenRepository,
                new BCryptPasswordEncoder(),
                authenticationManager,
                tokenService,
                properties);
    }

    @Test
    void registerHashesPasswordBeforeSavingUser() {
        when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.register(new RegisterRequest("USER@example.com", "password123", "Test User", null, null));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("user@example.com");
        assertThat(captor.getValue().getPasswordHash()).isNotEqualTo("password123");
        assertThat(new BCryptPasswordEncoder().matches("password123", captor.getValue().getPasswordHash())).isTrue();
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register(
                new RegisterRequest("user@example.com", "password123", "Test User", null, null)))
                .isInstanceOf(ApiException.class)
                .hasMessage("Email is already registered");
    }

    @Test
    void refreshRevokesOldTokenAndIssuesReplacement() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        RefreshToken existing = new RefreshToken();
        existing.setUser(user);
        existing.setTokenHash("hash");
        existing.setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plusHours(1));

        when(tokenService.hash("old-token")).thenReturn("hash");
        when(refreshTokenRepository.findByTokenHash("hash")).thenReturn(Optional.of(existing));
        when(tokenService.issueAccessToken(user))
                .thenReturn(new JwtTokenService.AccessToken("access", java.time.Instant.now().plusSeconds(900)));
        when(tokenService.issueRefreshToken())
                .thenReturn(new JwtTokenService.RefreshTokenValue("new-refresh", "new-hash"));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.refresh(new RefreshTokenRequest("old-token"));

        assertThat(response.tokens().refreshToken()).isEqualTo("new-refresh");
        assertThat(existing.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(existing);
    }
}
