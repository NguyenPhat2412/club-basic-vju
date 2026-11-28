package com.vju.club.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.SettingConstants;
import com.vju.club.config.RuntimeIntegrationConfig;
import com.vju.club.dto.response.SystemSecurityOverviewResponse;
import com.vju.club.entity.AuditLog;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.error.ApiException;
import com.vju.club.repository.AuditLogRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.RequestMetadataExtractor;
import com.vju.club.security.websocket.WebSocketSessionTracker;
import com.vju.club.service.SecurityTelemetryService;
import com.vju.club.service.TelegramAlertService;
import com.vju.club.service.UserSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

import static com.vju.club.service.impl.TelegramAlertServiceImpl.escapeHtml;

@Service
@Slf4j
@RequiredArgsConstructor
public class SecurityTelemetryServiceImpl implements SecurityTelemetryService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final UUID ANONYMOUS_RESOURCE_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");
    private static final long FAILED_LOGIN_WINDOW_SECONDS = 600;
    private static final long RATE_LIMIT_LOG_THROTTLE_SECONDS = 30;
    private static final int MAX_TRACKED_KEYS = 4_000;

    private static final List<String> LOGIN_SUCCESS_ACTIONS = List.of(AuditAction.USER_LOGGED_IN.name());
    private static final List<String> LOGIN_FAILED_ACTIONS = List.of(AuditAction.USER_LOGIN_FAILED.name());
    private static final List<String> RATE_LIMIT_ACTIONS = List.of(AuditAction.SECURITY_RATE_LIMIT_BLOCKED.name());
    private static final List<String> SENSITIVE_ACTIONS = List.of(
            AuditAction.SYSTEM_SETTINGS_UPDATED.name(),
            AuditAction.USER_LOCKED.name(),
            AuditAction.USER_UNLOCKED.name(),
            AuditAction.USER_SESSION_TERMINATED.name(),
            AuditAction.USER_PASSWORD_RESET.name(),
            AuditAction.USER_PASSWORD_CHANGED.name(),
            AuditAction.ROLE_ASSIGNED.name(),
            AuditAction.ROLE_REVOKED.name(),
            AuditAction.PERMISSION_GRANTED.name(),
            AuditAction.PERMISSION_REVOKED.name());
    private static final List<String> ALL_SECURITY_ACTIONS = buildAllSecurityActions();

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final WebSocketSessionTracker webSocketSessionTracker;
    private final UserSessionService userSessionService;
    private final RuntimeIntegrationConfig runtimeIntegrationConfig;
    private final TelegramAlertService telegramAlertService;
    private final Clock clock;

    private final ConcurrentHashMap<String, Deque<Instant>> failedLoginsByIp = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> rateLimitLogThrottle = new ConcurrentHashMap<>();

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginFailed(UUID targetUserId, String email, String reason, String method) {
        RequestMetadataExtractor.Metadata meta = RequestMetadataExtractor.extractCurrent();
        Map<String, Object> details = new LinkedHashMap<>();
        if (email != null && !email.isBlank()) details.put("email", email);
        if (reason != null && !reason.isBlank()) details.put("reason", reason);
        if (method != null && !method.isBlank()) details.put("method", method);

        UUID resourceId = targetUserId != null ? targetUserId : ANONYMOUS_RESOURCE_ID;
        auditLogRepository.save(new AuditLog(
                targetUserId,
                AuditAction.USER_LOGIN_FAILED.name(),
                AuditAction.ResourceType.USER.name(),
                resourceId,
                null,
                null,
                toJson(details),
                meta.ipAddress(),
                meta.userAgent()));

        String ipKey = meta.ipAddress() == null ? "unknown" : meta.ipAddress();
        int recentFailures = trackFailureSpike(ipKey);
        RuntimeIntegrationConfig.EffectiveTelegram tg = runtimeIntegrationConfig.telegram();
        if (tg.isActive() && tg.alertOnFailedLogin() && recentFailures >= tg.failedLoginThreshold()) {
            String body = """
                    • Cảnh báo: <b>Phát hiện đăng nhập thất bại liên tiếp (nghi ngờ Brute-force)</b>
                    • Địa chỉ IP: <code>%s</code>
                    • Số lần thất bại (10 phút): <b>%d</b>
                    • Tài khoản nhắm tới: <code>%s</code>
                    • Lý do gần nhất: <code>%s</code>
                    • Thiết bị: <code>%s</code>"""
                    .formatted(
                            escapeHtml(ipKey),
                            recentFailures,
                            escapeHtml(email == null ? "—" : email),
                            escapeHtml(reason == null ? "INVALID_CREDENTIALS" : reason),
                            escapeHtml(truncate(meta.userAgent(), 140)));
            telegramAlertService.sendAlertAsync("failed-login:" + ipKey, "Cảnh báo tấn công đăng nhập", body);
        }
    }

    @Override
    public void onLoginSuccess(User user, String method, boolean isAdmin) {
        if (!isAdmin || user == null) return;
        RuntimeIntegrationConfig.EffectiveTelegram tg = runtimeIntegrationConfig.telegram();
        if (!tg.isActive() || !tg.alertOnAdminLogin()) return;

        RequestMetadataExtractor.Metadata meta = RequestMetadataExtractor.extractCurrent();
        String ip = meta.ipAddress() == null ? "unknown" : meta.ipAddress();
        String body = """
                • Quản trị viên: <b>%s</b> (<code>%s</code>)
                • Phương thức: <code>%s</code>
                • Địa chỉ IP: <code>%s</code>
                • Thiết bị: <code>%s</code>"""
                .formatted(
                        escapeHtml(user.getFullName()),
                        escapeHtml(user.getEmail()),
                        escapeHtml(method == null ? "password" : method),
                        escapeHtml(ip),
                        escapeHtml(truncate(meta.userAgent(), 140)));
        telegramAlertService.sendAlertAsync("admin-login:" + user.getId() + ":" + ip, "Đăng nhập tài khoản Quản trị", body);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRateLimitBlocked(String route, String ipAddress, String userAgent, UUID userId) {
        String ip = (ipAddress == null || ipAddress.isBlank()) ? "unknown" : ipAddress;
        String safeRoute = route == null ? "" : route;
        String throttleKey = ip + "|" + safeRoute;
        Instant now = clock.instant();
        if (rateLimitLogThrottle.size() > MAX_TRACKED_KEYS) {
            rateLimitLogThrottle.entrySet().removeIf(e -> e.getValue().plusSeconds(RATE_LIMIT_LOG_THROTTLE_SECONDS).isBefore(now));
        }
        Instant last = rateLimitLogThrottle.get(throttleKey);
        if (last != null && last.plusSeconds(RATE_LIMIT_LOG_THROTTLE_SECONDS).isAfter(now)) {
            return;
        }
        rateLimitLogThrottle.put(throttleKey, now);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("route", safeRoute);
        details.put("status", 429);
        auditLogRepository.save(new AuditLog(
                userId,
                AuditAction.SECURITY_RATE_LIMIT_BLOCKED.name(),
                AuditAction.ResourceType.SECURITY.name(),
                userId != null ? userId : ANONYMOUS_RESOURCE_ID,
                null,
                null,
                toJson(details),
                ip,
                userAgent));

        RuntimeIntegrationConfig.EffectiveTelegram tg = runtimeIntegrationConfig.telegram();
        if (tg.isActive() && tg.alertOnRateLimit()) {
            String body = """
                    • Cảnh báo: <b>Chặn truy cập vượt ngưỡng (HTTP 429 Rate-Limit)</b>
                    • Địa chỉ IP: <code>%s</code>
                    • Đường dẫn: <code>%s</code>
                    • Thiết bị: <code>%s</code>"""
                    .formatted(
                            escapeHtml(ip),
                            escapeHtml(safeRoute),
                            escapeHtml(truncate(userAgent, 140)));
            telegramAlertService.sendAlertAsync("rate-limit:" + ip, "Chặn yêu cầu bất thường (429)", body);
        }
    }

    @Override
    public void onSensitiveSettingsChanged(UUID actorUserId, String summary) {
        RuntimeIntegrationConfig.EffectiveTelegram tg = runtimeIntegrationConfig.telegram();
        if (!tg.isActive() || !tg.alertOnSettingsChange()) return;

        RequestMetadataExtractor.Metadata meta = RequestMetadataExtractor.extractCurrent();
        String actorLabel = actorUserId == null ? "Hệ thống"
                : userRepository.findById(actorUserId)
                        .map(u -> u.getFullName() + " (" + u.getEmail() + ")")
                        .orElse(actorUserId.toString());
        String body = """
                • Người thực hiện: <b>%s</b>
                • Nội dung: %s
                • Địa chỉ IP: <code>%s</code>"""
                .formatted(
                        escapeHtml(actorLabel),
                        escapeHtml(summary == null ? "Cập nhật cài đặt hệ thống" : summary),
                        escapeHtml(meta.ipAddress() == null ? "unknown" : meta.ipAddress()));
        telegramAlertService.sendAlertAsync("settings-change:" + actorUserId, "Thay đổi cấu hình hệ thống", body);
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(SettingConstants.PERMISSION_VIEW)
    public SystemSecurityOverviewResponse getSecurityOverview(Actor actor, int windowHours) {
        int clampedHours = Math.max(1, Math.min(168, windowHours));
        OffsetDateTime since = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC).minusHours(clampedHours);

        List<WebSocketSessionTracker.ActiveSessionSnapshot> wsSnapshots = webSocketSessionTracker.activeSessions();
        int activeConnections = wsSnapshots.stream().mapToInt(WebSocketSessionTracker.ActiveSessionSnapshot::connections).sum();

        long loginSuccessCount = auditLogRepository.countByActionInAndCreatedAtAfter(LOGIN_SUCCESS_ACTIONS, since);
        long loginFailedCount = auditLogRepository.countByActionInAndCreatedAtAfter(LOGIN_FAILED_ACTIONS, since);
        long rateLimitBlockedCount = auditLogRepository.countByActionInAndCreatedAtAfter(RATE_LIMIT_ACTIONS, since);
        long sensitiveChangeCount = auditLogRepository.countByActionInAndCreatedAtAfter(SENSITIVE_ACTIONS, since);

        List<AuditLog> securityLogs = auditLogRepository.findByActionInAndCreatedAtAfterOrderByCreatedAtDesc(
                ALL_SECURITY_ACTIONS, since, PageRequest.of(0, 200));

        Set<UUID> userIds = new LinkedHashSet<>();
        wsSnapshots.forEach(s -> userIds.add(s.userId()));
        securityLogs.stream().limit(40).forEach(logRow -> {
            if (logRow.getActorUserId() != null) userIds.add(logRow.getActorUserId());
        });

        Map<UUID, User> usersById = new HashMap<>();
        if (!userIds.isEmpty()) {
            userRepository.findAllById(userIds).forEach(u -> usersById.put(u.getId(), u));
        }

        List<SystemSecurityOverviewResponse.OnlineUserItem> onlineUsers = wsSnapshots.stream()
                .map(snap -> {
                    User u = usersById.get(snap.userId());
                    return new SystemSecurityOverviewResponse.OnlineUserItem(
                            snap.userId(),
                            u != null ? u.getFullName() : snap.displayName(),
                            u != null ? u.getEmail() : null,
                            snap.ipAddress(),
                            snap.userAgent(),
                            snap.connections(),
                            snap.connectedAt() == null ? null : OffsetDateTime.ofInstant(snap.connectedAt(), ZoneOffset.UTC));
                })
                .sorted(Comparator.comparing(
                        SystemSecurityOverviewResponse.OnlineUserItem::connectedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<SystemSecurityOverviewResponse.SuspiciousIpItem> suspiciousIps = aggregateSuspiciousIps(securityLogs);

        List<SystemSecurityOverviewResponse.SecurityEventItem> recentEvents = securityLogs.stream()
                .limit(40)
                .map(row -> {
                    User actorUser = row.getActorUserId() == null ? null : usersById.get(row.getActorUserId());
                    Map<String, Object> parsed = parseJson(row.getNewValue());
                    String email = actorUser != null ? actorUser.getEmail() : stringVal(parsed.get("email"));
                    String summary = buildEventSummary(row.getAction(), parsed);
                    return new SystemSecurityOverviewResponse.SecurityEventItem(
                            row.getId(),
                            row.getCreatedAt(),
                            row.getAction(),
                            row.getResourceType(),
                            row.getActorUserId(),
                            actorUser != null ? actorUser.getFullName() : null,
                            email,
                            row.getIpAddress(),
                            row.getUserAgent(),
                            summary);
                })
                .toList();

        return new SystemSecurityOverviewResponse(
                clampedHours,
                onlineUsers.size(),
                activeConnections,
                loginSuccessCount,
                loginFailedCount,
                rateLimitBlockedCount,
                sensitiveChangeCount,
                onlineUsers,
                suspiciousIps,
                recentEvents);
    }

    @Override
    @Transactional
    @RequirePermission(SettingConstants.PERMISSION_UPDATE)
    public void disconnectOnlineUser(Actor actor, UUID targetUserId) {
        if (actor.id().equals(targetUserId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_DISCONNECT_SELF",
                    "You cannot disconnect your own active session from here");
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        int ended = userSessionService.endAllSessions(targetUserId);
        RequestMetadataExtractor.Metadata meta = RequestMetadataExtractor.extractCurrent();
        auditLogRepository.save(new AuditLog(
                actor.id(),
                AuditAction.USER_SESSION_TERMINATED.name(),
                AuditAction.ResourceType.USER.name(),
                targetUserId,
                null,
                null,
                toJson(Map.of("email", target.getEmail(), "endedSessions", ended)),
                meta.ipAddress(),
                meta.userAgent()));
        onSensitiveSettingsChanged(actor.id(),
                "Ngắt toàn bộ phiên hoạt động của " + target.getFullName() + " (" + target.getEmail() + ")");
    }

    private int trackFailureSpike(String ipKey) {
        Instant now = clock.instant();
        Instant cutoff = now.minusSeconds(FAILED_LOGIN_WINDOW_SECONDS);
        if (failedLoginsByIp.size() > MAX_TRACKED_KEYS) {
            failedLoginsByIp.entrySet().removeIf(e -> {
                Deque<Instant> q = e.getValue();
                while (!q.isEmpty() && q.peekFirst().isBefore(cutoff)) q.pollFirst();
                return q.isEmpty();
            });
        }
        Deque<Instant> queue = failedLoginsByIp.computeIfAbsent(ipKey, k -> new ConcurrentLinkedDeque<>());
        queue.addLast(now);
        while (!queue.isEmpty() && queue.peekFirst().isBefore(cutoff)) {
            queue.pollFirst();
        }
        return queue.size();
    }

    private static List<SystemSecurityOverviewResponse.SuspiciousIpItem> aggregateSuspiciousIps(List<AuditLog> logs) {
        Map<String, IpAccumulator> accByIp = new LinkedHashMap<>();
        for (AuditLog row : logs) {
            boolean isFailedLogin = AuditAction.USER_LOGIN_FAILED.name().equals(row.getAction());
            boolean isRateLimit = AuditAction.SECURITY_RATE_LIMIT_BLOCKED.name().equals(row.getAction());
            if (!isFailedLogin && !isRateLimit) continue;
            String ip = (row.getIpAddress() == null || row.getIpAddress().isBlank()) ? "unknown" : row.getIpAddress();
            IpAccumulator acc = accByIp.computeIfAbsent(ip, k -> new IpAccumulator());
            if (isFailedLogin) acc.failedLogins++;
            if (isRateLimit) acc.rateLimits++;
            if (acc.lastSeenAt == null || (row.getCreatedAt() != null && row.getCreatedAt().isAfter(acc.lastSeenAt))) {
                acc.lastSeenAt = row.getCreatedAt();
                acc.latestUserAgent = row.getUserAgent();
            }
            Map<String, Object> parsed = parseJson(row.getNewValue());
            String email = stringVal(parsed.get("email"));
            if (email != null && acc.targetEmails.size() < 5) {
                acc.targetEmails.add(email);
            }
        }
        return accByIp.entrySet().stream()
                .map(e -> new SystemSecurityOverviewResponse.SuspiciousIpItem(
                        e.getKey(),
                        e.getValue().failedLogins,
                        e.getValue().rateLimits,
                        List.copyOf(e.getValue().targetEmails),
                        e.getValue().lastSeenAt,
                        e.getValue().latestUserAgent))
                .sorted(Comparator.comparingLong((SystemSecurityOverviewResponse.SuspiciousIpItem item) ->
                        item.failedLoginCount() + item.rateLimitBlockedCount()).reversed()
                        .thenComparing(SystemSecurityOverviewResponse.SuspiciousIpItem::lastSeenAt,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(20)
                .toList();
    }

    private static final class IpAccumulator {
        long failedLogins;
        long rateLimits;
        OffsetDateTime lastSeenAt;
        String latestUserAgent;
        final Set<String> targetEmails = new LinkedHashSet<>();
    }

    private static String buildEventSummary(String action, Map<String, Object> parsed) {
        if (parsed.isEmpty()) return null;
        if (AuditAction.USER_LOGIN_FAILED.name().equals(action)) {
            String reason = stringVal(parsed.get("reason"));
            String method = stringVal(parsed.get("method"));
            return (method != null ? method + " · " : "") + (reason != null ? reason : "INVALID_CREDENTIALS");
        }
        if (AuditAction.SECURITY_RATE_LIMIT_BLOCKED.name().equals(action)) {
            return stringVal(parsed.get("route"));
        }
        if (AuditAction.USER_LOGGED_IN.name().equals(action)) {
            String method = stringVal(parsed.get("method"));
            return method != null ? method : "password";
        }
        if (AuditAction.USER_SESSION_TERMINATED.name().equals(action)) {
            String email = stringVal(parsed.get("email"));
            return email;
        }
        return stringVal(parsed.get("type"));
    }

    private static List<String> buildAllSecurityActions() {
        List<String> all = new ArrayList<>();
        all.addAll(LOGIN_SUCCESS_ACTIONS);
        all.addAll(LOGIN_FAILED_ACTIONS);
        all.addAll(RATE_LIMIT_ACTIONS);
        all.addAll(SENSITIVE_ACTIONS);
        return List.copyOf(all);
    }

    private static Map<String, Object> parseJson(String raw) {
        if (raw == null || raw.isBlank()) return Map.of();
        try {
            return JSON.readValue(raw, new TypeReference<>() {
            });
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private static String toJson(Map<String, Object> values) {
        try {
            return JSON.writeValueAsString(values);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static String stringVal(Object value) {
        if (value == null) return null;
        String s = value.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static String truncate(String value, int maxLen) {
        if (value == null || value.isBlank()) return "—";
        return value.length() <= maxLen ? value : value.substring(0, maxLen) + "…";
    }
}
