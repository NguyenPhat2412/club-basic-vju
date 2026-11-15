package com.vju.club.security.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionTracker implements WebSocketHandlerDecoratorFactory {
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
