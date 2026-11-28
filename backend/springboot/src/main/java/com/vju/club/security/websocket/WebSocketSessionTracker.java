package com.vju.club.security.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionTracker implements WebSocketHandlerDecoratorFactory {
    public record ActiveSessionSnapshot(
            UUID userId,
            String displayName,
            String ipAddress,
            String userAgent,
            int connections,
            Instant connectedAt) {
    }

    private final ConcurrentHashMap<UUID, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                UUID userId = extractUserId(session);
                if (userId != null) {
                    sessionsByUser.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(session);
                }
                super.afterConnectionEstablished(session);
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
                UUID userId = extractUserId(session);
                if (userId != null) {
                    sessionsByUser.computeIfPresent(userId, (k, set) -> {
                        set.remove(session);
                        return set.isEmpty() ? null : set;
                    });
                }
                super.afterConnectionClosed(session, closeStatus);
            }
        };
    }

    public List<ActiveSessionSnapshot> activeSessions() {
        List<ActiveSessionSnapshot> result = new ArrayList<>();
        sessionsByUser.forEach((userId, sessions) -> {
            List<WebSocketSession> open = sessions.stream().filter(WebSocketSession::isOpen).toList();
            if (open.isEmpty()) return;
            String displayName = null;
            String ipAddress = null;
            String userAgent = null;
            Instant latestConnected = null;
            for (WebSocketSession s : open) {
                Object p = s.getAttributes().get(SessionHandshakeInterceptor.ATTR_PRINCIPAL);
                if (displayName == null && p instanceof ActorPrincipal ap) {
                    displayName = ap.fullName();
                }
                Instant connectedAt = s.getAttributes().get(SessionHandshakeInterceptor.ATTR_CONNECTED_AT) instanceof Instant inst
                        ? inst : null;
                if (latestConnected == null || (connectedAt != null && connectedAt.isAfter(latestConnected))) {
                    latestConnected = connectedAt;
                    if (s.getAttributes().get(SessionHandshakeInterceptor.ATTR_IP_ADDRESS) instanceof String ip) {
                        ipAddress = ip;
                    }
                    if (s.getAttributes().get(SessionHandshakeInterceptor.ATTR_USER_AGENT) instanceof String ua) {
                        userAgent = ua;
                    }
                }
            }
            result.add(new ActiveSessionSnapshot(userId, displayName, ipAddress, userAgent, open.size(), latestConnected));
        });
        return result;
    }

    public void closeUserSessions(UUID userId) {
        Set<WebSocketSession> active = sessionsByUser.remove(userId);
        if (active == null) return;
        for (WebSocketSession session : active) {
            try {
                if (session.isOpen()) {
                    session.close(CloseStatus.POLICY_VIOLATION);
                }
            } catch (IOException ignored) {
            }
        }
    }

    private static UUID extractUserId(WebSocketSession session) {
        if (session.getPrincipal() instanceof ActorPrincipal p) return p.userId();
        Object attr = session.getAttributes().get(SessionHandshakeInterceptor.ATTR_PRINCIPAL);
        return attr instanceof ActorPrincipal p ? p.userId() : null;
    }
}
