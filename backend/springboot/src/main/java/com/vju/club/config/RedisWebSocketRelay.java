package com.vju.club.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.dto.response.NotificationRealtimeEvent;
import com.vju.club.service.RealtimeMessagePublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

/**
 * Bridges STOMP WebSocket broadcasts across horizontally scaled backend nodes using
 * Redis Pub/Sub ({@value #BROADCAST_CHANNEL}).
 *
 * <p>Origin nodes deliver immediately to local subscribers and publish an envelope tagged
 * with {@code originNodeId}. Remote nodes deliver once locally on receipt; the origin node
 * ignores its own echo so every node delivers exactly once with zero loop risk.
 * When Redis is disabled, calls fall back directly to {@link SimpMessagingTemplate}.
 */
public class RedisWebSocketRelay implements RealtimeMessagePublisher, MessageListener {
    private static final Logger log = LoggerFactory.getLogger(RedisWebSocketRelay.class);
    public static final String BROADCAST_CHANNEL = "vju:ws:broadcast";
    private static final ObjectMapper JSON = JsonMapper.builder().findAndAddModules().build();
    private static final Map<String, Class<?>> ALLOWED_PAYLOAD_TYPES = Map.of(
            ChatRealtimeEvent.class.getName(), ChatRealtimeEvent.class,
            NotificationRealtimeEvent.class.getName(), NotificationRealtimeEvent.class
    );

    private final SimpMessagingTemplate messagingTemplate;
    private final StringRedisTemplate redisTemplate;
    private final boolean redisEnabled;
    private final String nodeId;

    public RedisWebSocketRelay(
            SimpMessagingTemplate messagingTemplate,
            StringRedisTemplate redisTemplate,
            boolean redisEnabled) {
        this(messagingTemplate, redisTemplate, redisEnabled, UUID.randomUUID().toString());
    }

    RedisWebSocketRelay(
            SimpMessagingTemplate messagingTemplate,
            StringRedisTemplate redisTemplate,
            boolean redisEnabled,
            String nodeId) {
        this.messagingTemplate = messagingTemplate;
        this.redisTemplate = redisTemplate;
        this.redisEnabled = redisEnabled && redisTemplate != null;
        this.nodeId = nodeId;
    }

    public static RedisWebSocketRelay localOnly(SimpMessagingTemplate messagingTemplate) {
        return new RedisWebSocketRelay(messagingTemplate, null, false);
    }

    public boolean isRedisEnabled() {
        return redisEnabled;
    }

    public String getNodeId() {
        return nodeId;
    }

    @Override
    public void convertAndSend(String destination, Object payload) {
        if (destination == null) return;
        messagingTemplate.convertAndSend(destination, payload);
        publishToRedis(null, destination, payload);
    }

    @Override
    public void convertAndSendToUser(String user, String destination, Object payload) {
        if (user == null || destination == null) return;
        messagingTemplate.convertAndSendToUser(user, destination, payload);
        publishToRedis(user, destination, payload);
    }

    private void publishToRedis(String user, String destination, Object payload) {
        if (!redisEnabled) return;
        try {
            String payloadType = payload != null ? payload.getClass().getName() : null;
            JsonNode payloadNode = payload != null ? JSON.valueToTree(payload) : null;
            BroadcastEnvelope envelope = new BroadcastEnvelope(nodeId, user, destination, payloadType, payloadNode);
            redisTemplate.convertAndSend(BROADCAST_CHANNEL, JSON.writeValueAsString(envelope));
        } catch (Exception ex) {
            log.warn("Redis WebSocket relay publish failed for {}: {}", destination, ex.getMessage());
        }
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        if (message == null || message.getBody() == null) return;
        try {
            String raw = new String(message.getBody(), StandardCharsets.UTF_8);
            BroadcastEnvelope envelope = JSON.readValue(raw, BroadcastEnvelope.class);
            if (envelope == null || envelope.destination() == null || nodeId.equals(envelope.originNodeId())) {
                return;
            }
            Object payload = decodePayload(envelope.payloadType(), envelope.payload());
            if (payload == null) {
                return;
            }
            if (envelope.user() != null && !envelope.user().isBlank()) {
                messagingTemplate.convertAndSendToUser(envelope.user(), envelope.destination(), payload);
            } else {
                messagingTemplate.convertAndSend(envelope.destination(), payload);
            }
        } catch (Exception ex) {
            log.warn("Failed to relay Redis WebSocket broadcast: {}", ex.getMessage());
        }
    }

    private Object decodePayload(String payloadType, JsonNode payloadNode) throws Exception {
        if (payloadNode == null || payloadNode.isNull()) {
            return null;
        }
        Class<?> targetType = payloadType != null ? ALLOWED_PAYLOAD_TYPES.get(payloadType) : null;
        if (targetType != null) {
            return JSON.treeToValue(payloadNode, targetType);
        }
        if (payloadNode.isObject()) {
            return JSON.treeToValue(payloadNode, Map.class);
        }
        return JSON.treeToValue(payloadNode, Object.class);
    }

    record BroadcastEnvelope(
            String originNodeId,
            String user,
            String destination,
            String payloadType,
            JsonNode payload
    ) {}
}
