package com.vju.club.service;

import com.vju.club.dto.response.SystemSecurityOverviewResponse;
import com.vju.club.entity.User;
import com.vju.club.security.Actor;

import java.util.UUID;

public interface SecurityTelemetryService {
    void recordLoginFailed(UUID targetUserId, String email, String reason, String method);

    void onLoginSuccess(User user, String method, boolean isAdmin);

    void recordRateLimitBlocked(String route, String ipAddress, String userAgent, UUID userId);

    void onSensitiveSettingsChanged(UUID actorUserId, String summary);

    SystemSecurityOverviewResponse getSecurityOverview(Actor actor, int windowHours);

    void disconnectOnlineUser(Actor actor, UUID targetUserId);
}
