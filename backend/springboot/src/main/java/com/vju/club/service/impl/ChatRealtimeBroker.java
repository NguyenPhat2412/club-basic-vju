package com.vju.club.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.dto.response.NotificationRealtimeEvent;
import com.vju.club.security.websocket.ActorPrincipal;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class ChatRealtimeBroker implements MessageListener {
    private static final Logger log = LoggerFactory.getLogger(ChatRealtimeBroker.class);
    private static final String REDIS_TOPIC = "club:chat:realtime";
    private static final String REDIS_NOTIF_TOPIC = "club:notif:realtime";
    private static final ObjectMapper JSON = JsonMapper.builder().findAndAddModules().build();

    private final SimpMessagingTemplate messagingTemplate;
    private final RedisConnectionFactory redisConnectionFactory;
    private final StringRedisTemplate redisTemplate;
    private final boolean redisRelayEnabled;
    private final Clock clock;
    private RedisMessageListenerContainer listenerContainer;

    public ChatRealtimeBroker(
            SimpMessagingTemplate messagingTemplate,
            RedisConnectionFactory redisConnectionFactory,
            @Value("${app.cache.type:simple}") String cacheType,
            Clock clock) {
        this.messagingTemplate = messagingTemplate;
        this.redisConnectionFactory = redisConnectionFactory;
        this.redisRelayEnabled = "redis".equalsIgnoreCase(cacheType.strip());
        this.redisTemplate = this.redisRelayEnabled ? new StringRedisTemplate(redisConnectionFactory) : null;
        this.clock = clock;
    }

    @PostConstruct
    void initRedisSubscriber() {
        if (!redisRelayEnabled) return;
        try {
            listenerContainer = new RedisMessageListenerContainer();
            listenerContainer.setConnectionFactory(redisConnectionFactory);
            listenerContainer.addMessageListener(this, new ChannelTopic(REDIS_TOPIC));
            listenerContainer.addMessageListener(this, new ChannelTopic(REDIS_NOTIF_TOPIC));
            listenerContainer.afterPropertiesSet();
            listenerContainer.start();
        } catch (RuntimeException ex) {
            log.warn("Could not start Redis Pub/Sub relay for WebSocket chat, falling back to local broker: {}", ex.getMessage());
            listenerContainer = null;
        }
    }

    @PreDestroy
    void shutdownRedisSubscriber() {
        if (listenerContainer != null) {
            try {
                listenerContainer.destroy();
            } catch (Exception ignored) {
            }
        }
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
        if (redisRelayEnabled && listenerContainer != null && redisTemplate != null) {
            try {
                redisTemplate.convertAndSend(REDIS_TOPIC, JSON.writeValueAsString(event));
                return;
            } catch (Exception ex) {
                log.warn("Redis Pub/Sub publish failed, dispatching locally: {}", ex.getMessage());
            }
        }
        dispatchLocally(event);
    }

    public void publishNotification(NotificationRealtimeEvent event) {
        if (event == null || event.userId() == null) return;
        if (redisRelayEnabled && listenerContainer != null && redisTemplate != null) {
            try {
                redisTemplate.convertAndSend(REDIS_NOTIF_TOPIC, JSON.writeValueAsString(event));
                return;
            } catch (Exception ex) {
                log.warn("Redis Pub/Sub notification publish failed, dispatching locally: {}", ex.getMessage());
            }
        }
        dispatchNotificationLocally(event);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
            String raw = new String(message.getBody(), StandardCharsets.UTF_8);
            if (REDIS_NOTIF_TOPIC.equals(channel)) {
                dispatchNotificationLocally(JSON.readValue(raw, NotificationRealtimeEvent.class));
            } else {
                dispatchLocally(JSON.readValue(raw, ChatRealtimeEvent.class));
            }
        } catch (Exception ex) {
            log.warn("Failed to decode Redis realtime event: {}", ex.getMessage());
        }
    }

    private void dispatchNotificationLocally(NotificationRealtimeEvent event) {
        if (event.userId() != null) {
            messagingTemplate.convertAndSendToUser(event.userId().toString(), "/queue/notifications", event);
        }
    }

    private void dispatchLocally(ChatRealtimeEvent event) {
        if (event.channelId() != null) {
            messagingTemplate.convertAndSend("/topic/channels." + event.channelId(), event);
        }
        if (event.recipientUserIds() != null && !event.recipientUserIds().isEmpty()) {
            for (UUID userId : event.recipientUserIds()) {
                if (event.actorId() != null && event.actorId().equals(userId)) {
                    continue;
                }
                messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/chat-events", event);
            }
        }
    }
}
