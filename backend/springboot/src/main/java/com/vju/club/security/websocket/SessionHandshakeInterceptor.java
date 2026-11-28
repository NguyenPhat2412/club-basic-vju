package com.vju.club.security.websocket;

import com.vju.club.entity.User;
import com.vju.club.enums.UserStatus;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.RequestMetadataExtractor;
import com.vju.club.security.SecurityIdentity;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SessionHandshakeInterceptor implements HandshakeInterceptor {
    private static final Logger log = LoggerFactory.getLogger(SessionHandshakeInterceptor.class);
    public static final String ATTR_PRINCIPAL = "vju.actorPrincipal";
    public static final String ATTR_IP_ADDRESS = "vju.ipAddress";
    public static final String ATTR_USER_AGENT = "vju.userAgent";
    public static final String ATTR_CONNECTED_AT = "vju.connectedAt";

    private final UserRepository userRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Optional<UUID> userIdOpt = SecurityIdentity.currentUserId(auth);
        if (userIdOpt.isEmpty() && request.getPrincipal() instanceof Authentication reqAuth) {
            userIdOpt = SecurityIdentity.currentUserId(reqAuth);
        }
        if (userIdOpt.isEmpty()) {
            log.debug("Rejected unauthenticated WebSocket handshake from {}", request.getRemoteAddress());
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
        User user = userRepository.findById(userIdOpt.get()).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE || user.getAnonymizedAt() != null || user.isRequiresPasswordChange()) {
            log.debug("Rejected WebSocket handshake for inactive/restricted user {}", userIdOpt.get());
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }
        attributes.put(ATTR_PRINCIPAL, new ActorPrincipal(user.getId(), user.getFullName()));
        RequestMetadataExtractor.Metadata meta = RequestMetadataExtractor.extract(request);
        if (meta.ipAddress() != null) {
            attributes.put(ATTR_IP_ADDRESS, meta.ipAddress());
        }
        if (meta.userAgent() != null) {
            attributes.put(ATTR_USER_AGENT, meta.userAgent());
        }
        attributes.put(ATTR_CONNECTED_AT, Instant.now());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
    }
}
