package com.vju.club.service;

import com.vju.club.config.RuntimeIntegrationConfig;
import com.vju.club.dto.response.SystemSecurityOverviewResponse;
import com.vju.club.entity.AuditLog;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.repository.AuditLogRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.websocket.WebSocketSessionTracker;
import com.vju.club.service.impl.SecurityTelemetryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.vju.club.support.ApiErrors.assertApiError;
import static com.vju.club.support.PermissionChecks.withPermissionChecks;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SecurityTelemetryServiceTest {
    @Mock AuditLogRepository auditLogRepository;
    @Mock UserRepository userRepository;
    @Mock WebSocketSessionTracker webSocketSessionTracker;
    @Mock UserSessionService userSessionService;
    @Mock RuntimeIntegrationConfig runtimeIntegrationConfig;
    @Mock TelegramAlertService telegramAlertService;
    @Mock PermissionAuthorizationService authorization;

    private final Clock fixedClock = Clock.fixed(Instant.parse("2026-11-28T02:00:00Z"), ZoneOffset.UTC);
    private SecurityTelemetryService service;

    @BeforeEach
    void setUp() {
        SecurityTelemetryServiceImpl impl = new SecurityTelemetryServiceImpl(
                auditLogRepository,
                userRepository,
                webSocketSessionTracker,
                userSessionService,
                runtimeIntegrationConfig,
                telegramAlertService,
                fixedClock);
        service = withPermissionChecks(impl, authorization);
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void failedLoginBurstTriggersTelegramAlertWithRealCloudflareIp() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("CF-Connecting-IP", "203.0.113.45");
        req.addHeader("User-Agent", "Mozilla/5.0 AttackBot");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(req));

        when(runtimeIntegrationConfig.telegram()).thenReturn(new RuntimeIntegrationConfig.EffectiveTelegram(
                true, "token", "-1001", "", "https://api.telegram.org",
                true, 3, true, true, true, true, true, 180));

        service.recordLoginFailed(null, "victim@vju.ac.vn", "INVALID_CREDENTIALS", "password");
        service.recordLoginFailed(null, "victim@vju.ac.vn", "INVALID_CREDENTIALS", "password");
        service.recordLoginFailed(null, "victim@vju.ac.vn", "INVALID_CREDENTIALS", "password");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository, times(3)).save(captor.capture());
        assertThat(captor.getValue().getAction()).isEqualTo(AuditAction.USER_LOGIN_FAILED.name());
        assertThat(captor.getValue().getIpAddress()).isEqualTo("203.0.113.45");

        verify(telegramAlertService, times(1)).sendAlertAsync(
                eq("failed-login:203.0.113.45"),
                contains("đăng nhập"),
                contains("203.0.113.45"));
    }

    @Test
    void securityOverviewAggregatesOnlineUsersAndSuspiciousIps() {
        Actor actor = new Actor(UUID.randomUUID());
        UUID onlineId = UUID.randomUUID();
        User onlineUser = new User();
        onlineUser.setId(onlineId);
        onlineUser.setFullName("Nguyen Van A");
        onlineUser.setEmail("a@st.vju.ac.vn");

        when(webSocketSessionTracker.activeSessions()).thenReturn(List.of(
                new WebSocketSessionTracker.ActiveSessionSnapshot(
                        onlineId, "Nguyen Van A", "198.51.100.12", "Chrome/130", 2, Instant.parse("2026-11-28T01:55:00Z"))));
        when(auditLogRepository.countByActionInAndCreatedAtAfter(anyCollection(), any())).thenReturn(4L);

        AuditLog failed = new AuditLog(
                null, AuditAction.USER_LOGIN_FAILED.name(), AuditAction.ResourceType.USER.name(),
                UUID.randomUUID(), null, null,
                "{\"email\":\"admin@vju.ac.vn\",\"reason\":\"INVALID_CREDENTIALS\"}",
                "203.0.113.99", "curl/8.7");
        failed.setCreatedAt(OffsetDateTime.parse("2026-11-28T01:58:00Z"));
        AuditLog blocked = new AuditLog(
                null, AuditAction.SECURITY_RATE_LIMIT_BLOCKED.name(), AuditAction.ResourceType.SECURITY.name(),
                UUID.randomUUID(), null, null,
                "{\"route\":\"/api/v1/auth/login\",\"status\":429}",
                "203.0.113.99", "curl/8.7");
        blocked.setCreatedAt(OffsetDateTime.parse("2026-11-28T01:59:00Z"));

        when(auditLogRepository.findByActionInAndCreatedAtAfterOrderByCreatedAtDesc(anyCollection(), any(), any()))
                .thenReturn(List.of(blocked, failed));
        when(userRepository.findAllById(any())).thenReturn(List.of(onlineUser));

        SystemSecurityOverviewResponse overview = service.getSecurityOverview(actor, 24);
        assertThat(overview.onlineUserCount()).isEqualTo(1);
        assertThat(overview.activeConnectionCount()).isEqualTo(2);
        assertThat(overview.onlineUsers().getFirst().ipAddress()).isEqualTo("198.51.100.12");
        assertThat(overview.suspiciousIps()).hasSize(1);
        assertThat(overview.suspiciousIps().getFirst().ipAddress()).isEqualTo("203.0.113.99");
        assertThat(overview.suspiciousIps().getFirst().failedLoginCount()).isEqualTo(1);
        assertThat(overview.suspiciousIps().getFirst().rateLimitBlockedCount()).isEqualTo(1);
        assertThat(overview.suspiciousIps().getFirst().targetEmails()).containsExactly("admin@vju.ac.vn");
    }

    @Test
    void disconnectOnlineUserRejectsSelfDisconnectAndEndsTargetSessions() {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        Actor actor = new Actor(adminId);

        assertApiError(() -> service.disconnectOnlineUser(actor, adminId),
                HttpStatus.BAD_REQUEST, "CANNOT_DISCONNECT_SELF");

        User target = new User();
        target.setId(targetId);
        target.setFullName("Target User");
        target.setEmail("target@st.vju.ac.vn");
        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(userSessionService.endAllSessions(targetId)).thenReturn(2);
        when(runtimeIntegrationConfig.telegram()).thenReturn(new RuntimeIntegrationConfig.EffectiveTelegram(
                false, "", "", "", "https://api.telegram.org", true, 5, true, true, true, true, true, 180));

        service.disconnectOnlineUser(actor, targetId);
        verify(userSessionService).endAllSessions(targetId);
        verify(auditLogRepository).save(any(AuditLog.class));
    }
}
