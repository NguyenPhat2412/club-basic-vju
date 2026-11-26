package com.vju.club.service.impl;

import com.vju.club.config.RedisWebSocketRelay;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.dto.response.NotificationRealtimeEvent;
import com.vju.club.security.websocket.ActorPrincipal;
import com.vju.club.service.RealtimeMessagePublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class ChatRealtimeBroker {
    private final RealtimeMessagePublisher publisher;
    private final Clock clock;

    @Autowired
    public ChatRealtimeBroker(RealtimeMessagePublisher publisher, Clock clock) {
        this.publisher = publisher;
        this.clock = clock;
    }

    ChatRealtimeBroker(
            SimpMessagingTemplate messagingTemplate,
            RedisConnectionFactory ignoredConnectionFactory,
            String ignoredCacheType,
            Clock clock) {
        this(RedisWebSocketRelay.localOnly(messagingTemplate), clock);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onChatEvent(ChatRealtimeEvent event) {
        publish(event);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotificationEvent(NotificationRealtimeEvent event) {
        publishNotification(event);
    }

    public void publishTyping(UUID channelId, ActorPrincipal principal) {
        publish(new ChatRealtimeEvent(
                "TYPING",
                null,
                channelId,
                principal.userId(),
                principal.fullName(),
                null,
                null,
                List.of(),
                OffsetDateTime.now(clock)
        ));
    }

    public void publish(ChatRealtimeEvent event) {
        if (event == null) return;
        if (event.channelId() != null) {
            publisher.convertAndSend("/topic/channels." + event.channelId(), event);
        }
        if (event.recipientUserIds() != null && !event.recipientUserIds().isEmpty()) {
            for (UUID userId : event.recipientUserIds()) {
                if (event.actorId() != null && event.actorId().equals(userId)) {
                    continue;
                }
                publisher.convertAndSendToUser(userId.toString(), "/queue/chat-events", event);
            }
        }
    }

    public void publishNotification(NotificationRealtimeEvent event) {
        if (event == null || event.userId() == null) return;
        publisher.convertAndSendToUser(event.userId().toString(), "/queue/notifications", event);
    }
}
