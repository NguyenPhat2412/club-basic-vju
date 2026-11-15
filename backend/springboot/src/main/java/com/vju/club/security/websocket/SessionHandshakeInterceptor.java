package com.vju.club.security.websocket;

import com.vju.club.entity.User;
import com.vju.club.enums.UserStatus;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.SecurityIdentity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SessionHandshakeInterceptor implements HandshakeInterceptor {
    public static final String ATTR_PRINCIPAL = "vju.actorPrincipal";

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
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
        User user = userRepository.findById(userIdOpt.get()).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE || user.getAnonymizedAt() != null || user.isRequiresPasswordChange()) {
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }
        attributes.put(ATTR_PRINCIPAL, new ActorPrincipal(user.getId(), user.getFullName()));
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
    }
}
