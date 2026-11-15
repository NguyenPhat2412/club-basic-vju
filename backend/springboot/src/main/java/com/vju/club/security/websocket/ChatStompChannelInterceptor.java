package com.vju.club.security.websocket;

import com.vju.club.common.ChatConstants;
import com.vju.club.entity.User;
import com.vju.club.enums.UserStatus;
import com.vju.club.repository.UserRepository;
import com.vju.club.service.impl.ChatAccessPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class ChatStompChannelInterceptor implements ChannelInterceptor {
    private static final String CHANNEL_TOPIC_PREFIX = "/topic/channels.";
    private static final String TYPING_APP_PREFIX = "/app/channels.";
    private static final long TYPING_COOLDOWN_MS = 1_500L;
    // ponytail: bounded at 2048 active user-channel pairs, move to Redis if >10k concurrent typers
    private static final int MAX_TYPING_WINDOW = 2_048;

    private final ChatAccessPolicy chatAccessPolicy;
    private final UserRepository userRepository;
    private final ConcurrentHashMap<String, Long> typingWindow = new ConcurrentHashMap<>();

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT) {
            ActorPrincipal principal = resolveActivePrincipal(accessor);
            accessor.setUser(principal);
            return message;
        }
        if (command == StompCommand.SUBSCRIBE) {
            ActorPrincipal principal = resolveActivePrincipal(accessor);
            String destination = accessor.getDestination();
            if (destination == null) {
                throw new MessagingException("PERMISSION_DENIED: Missing destination");
            }
            if (destination.startsWith(CHANNEL_TOPIC_PREFIX)) {
                UUID channelId = parseChannelId(destination.substring(CHANNEL_TOPIC_PREFIX.length()));
                try {
                    chatAccessPolicy.requireChannelAccessById(principal.toActor(), channelId, ChatConstants.PERMISSION_VIEW, false);
                } catch (RuntimeException ex) {
                    throw new MessagingException("PERMISSION_DENIED: Cannot subscribe to channel " + channelId, ex);
                }
            } else if (!destination.equals("/user/queue/chat-events")) {
                throw new MessagingException("PERMISSION_DENIED: Unsupported destination " + destination);
            }
            return message;
        }
        if (command == StompCommand.SEND) {
            ActorPrincipal principal = resolvePrincipal(accessor);
            String destination = accessor.getDestination();
            if (destination == null || !destination.startsWith(TYPING_APP_PREFIX) || !destination.endsWith(".typing")) {
                throw new MessagingException("PERMISSION_DENIED: Unsupported STOMP SEND destination");
            }
            String middle = destination.substring(TYPING_APP_PREFIX.length(), destination.length() - ".typing".length());
            UUID channelId = parseChannelId(middle);
            String rateKey = principal.userId() + ":" + channelId;
            long now = System.currentTimeMillis();
            final boolean[] allowedByRate = {false};
            typingWindow.compute(rateKey, (k, prev) -> {
                if (prev != null && now - prev < TYPING_COOLDOWN_MS) {
                    return prev;
                }
                allowedByRate[0] = true;
                return now;
            });
            if (!allowedByRate[0]) {
                return null;
            }
            if (typingWindow.size() > MAX_TYPING_WINDOW) {
                typingWindow.entrySet().removeIf(entry -> now - entry.getValue() >= TYPING_COOLDOWN_MS);
            }
            try {
                requireActiveAccount(principal.userId());
                chatAccessPolicy.requireChannelAccessById(principal.toActor(), channelId, ChatConstants.PERMISSION_SEND, true);
            } catch (MessagingException ex) {
                typingWindow.remove(rateKey);
                throw ex;
            } catch (RuntimeException ex) {
                typingWindow.remove(rateKey);
                throw new MessagingException("PERMISSION_DENIED: Cannot send typing event", ex);
            }
        }
        return message;
    }

    private ActorPrincipal resolveActivePrincipal(StompHeaderAccessor accessor) {
        ActorPrincipal principal = resolvePrincipal(accessor);
        requireActiveAccount(principal.userId());
        return principal;
    }

    private void requireActiveAccount(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE || user.getAnonymizedAt() != null || user.isRequiresPasswordChange()) {
            throw new MessagingException("UNAUTHORIZED: Account is inactive or requires password change");
        }
    }

    private static ActorPrincipal resolvePrincipal(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof ActorPrincipal p) {
            return p;
        }
        Map<String, Object> attrs = accessor.getSessionAttributes();
        if (attrs != null && attrs.get(SessionHandshakeInterceptor.ATTR_PRINCIPAL) instanceof ActorPrincipal p) {
            accessor.setUser(p);
            return p;
        }
        throw new MessagingException("UNAUTHORIZED: Authenticated session is required");
    }

    private static UUID parseChannelId(String raw) {
        try {
            return UUID.fromString(raw.strip());
        } catch (IllegalArgumentException ex) {
            throw new MessagingException("VALIDATION_ERROR: Invalid channel ID", ex);
        }
    }
}
