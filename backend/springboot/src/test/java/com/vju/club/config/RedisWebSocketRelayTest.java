package com.vju.club.config;

import com.vju.club.dto.response.ChatRealtimeEvent;
import com.vju.club.dto.response.NotificationRealtimeEvent;
import com.vju.club.dto.response.NotificationResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.connection.DefaultMessage;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.mock.env.MockEnvironment;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class RedisWebSocketRelayTest {

    @Test
    void localFallbackDispatchesDirectlyWithoutTouchingRedis() {
        SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        RedisWebSocketRelay relay = new RedisWebSocketRelay(template, redis, false, "node-local");

        assertThat(relay.isRedisEnabled()).isFalse();

        UUID channelId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        ChatRealtimeEvent chatEvent = sampleChatEvent(channelId, userId);
        NotificationRealtimeEvent notifEvent = sampleNotificationEvent(userId);

        relay.convertAndSend("/topic/channels." + channelId, chatEvent);
        relay.convertAndSendToUser(userId.toString(), "/queue/notifications", notifEvent);

        verify(template, times(1)).convertAndSend("/topic/channels." + channelId, chatEvent);
        verify(template, times(1)).convertAndSendToUser(userId.toString(), "/queue/notifications", notifEvent);
        verifyNoInteractions(redis);
    }

    @Test
    void redisRelayPublishesTopicBroadcastSuppressesOriginEchoAndDeliversToPeerOnce() {
        SimpMessagingTemplate templateA = mock(SimpMessagingTemplate.class);
        SimpMessagingTemplate templateB = mock(SimpMessagingTemplate.class);
        StringRedisTemplate redisA = mock(StringRedisTemplate.class);
        StringRedisTemplate redisB = mock(StringRedisTemplate.class);

        RedisWebSocketRelay nodeA = new RedisWebSocketRelay(templateA, redisA, true, "node-A");
        RedisWebSocketRelay nodeB = new RedisWebSocketRelay(templateB, redisB, true, "node-B");

        UUID channelId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        String destination = "/topic/channels." + channelId;
        ChatRealtimeEvent event = sampleChatEvent(channelId, actorId);

        nodeA.convertAndSend(destination, event);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(redisA, times(1)).convertAndSend(eq(RedisWebSocketRelay.BROADCAST_CHANNEL), payloadCaptor.capture());
        String wireJson = payloadCaptor.getValue();
        assertThat(wireJson).contains("\"originNodeId\":\"node-A\"").contains(destination);

        DefaultMessage redisMessage = new DefaultMessage(
                RedisWebSocketRelay.BROADCAST_CHANNEL.getBytes(StandardCharsets.UTF_8),
                wireJson.getBytes(StandardCharsets.UTF_8)
        );

        // Origin node receives its own Pub/Sub echo -> ignored (still exactly 1 local delivery)
        nodeA.onMessage(redisMessage, null);
        verify(templateA, times(1)).convertAndSend(destination, event);

        // Peer node receives the message -> delivers once locally and never re-publishes to Redis
        nodeB.onMessage(redisMessage, null);
        ArgumentCaptor<ChatRealtimeEvent> receivedCaptor = ArgumentCaptor.forClass(ChatRealtimeEvent.class);
        verify(templateB, times(1)).convertAndSend(eq(destination), receivedCaptor.capture());
        assertThat(receivedCaptor.getValue().type()).isEqualTo("TYPING");
        assertThat(receivedCaptor.getValue().channelId()).isEqualTo(channelId);
        assertThat(receivedCaptor.getValue().actorId()).isEqualTo(actorId);
        verifyNoInteractions(redisB);
    }

    @Test
    void redisRelayDeliversUserQueueNotificationsAcrossNodes() {
        SimpMessagingTemplate templateA = mock(SimpMessagingTemplate.class);
        SimpMessagingTemplate templateB = mock(SimpMessagingTemplate.class);
        StringRedisTemplate redisA = mock(StringRedisTemplate.class);
        StringRedisTemplate redisB = mock(StringRedisTemplate.class);

        RedisWebSocketRelay nodeA = new RedisWebSocketRelay(templateA, redisA, true, "node-A");
        RedisWebSocketRelay nodeB = new RedisWebSocketRelay(templateB, redisB, true, "node-B");

        UUID userId = UUID.randomUUID();
        NotificationRealtimeEvent notifEvent = sampleNotificationEvent(userId);

        nodeA.convertAndSendToUser(userId.toString(), "/queue/notifications", notifEvent);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(redisA, times(1)).convertAndSend(eq(RedisWebSocketRelay.BROADCAST_CHANNEL), payloadCaptor.capture());

        DefaultMessage redisMessage = new DefaultMessage(
                RedisWebSocketRelay.BROADCAST_CHANNEL.getBytes(StandardCharsets.UTF_8),
                payloadCaptor.getValue().getBytes(StandardCharsets.UTF_8)
        );

        nodeA.onMessage(redisMessage, null);
        verify(templateA, times(1)).convertAndSendToUser(userId.toString(), "/queue/notifications", notifEvent);

        nodeB.onMessage(redisMessage, null);
        ArgumentCaptor<NotificationRealtimeEvent> receivedCaptor = ArgumentCaptor.forClass(NotificationRealtimeEvent.class);
        verify(templateB, times(1)).convertAndSendToUser(eq(userId.toString()), eq("/queue/notifications"), receivedCaptor.capture());
        assertThat(receivedCaptor.getValue().userId()).isEqualTo(userId);
        assertThat(receivedCaptor.getValue().unreadCount()).isEqualTo(3L);
        verify(redisB, never()).convertAndSend(anyString(), anyString());
    }

    @Test
    void redisPublishFailureDoesNotBreakLocalDelivery() {
        SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        doThrow(new RedisConnectionFailureException("Redis down"))
                .when(redis).convertAndSend(anyString(), any(Object.class));

        RedisWebSocketRelay relay = new RedisWebSocketRelay(template, redis, true, "node-A");
        UUID channelId = UUID.randomUUID();
        ChatRealtimeEvent event = sampleChatEvent(channelId, UUID.randomUUID());

        relay.convertAndSend("/topic/channels." + channelId, event);

        verify(template, times(1)).convertAndSend("/topic/channels." + channelId, event);
    }

    @Test
    void redisRelayConditionMatchesSpringOrAppCacheTypeAndApplicationClockAlignsToMicroseconds() {
        assertThat(RedisRealtimeRelayConfig.isRedisEnabled(new MockEnvironment().withProperty("spring.cache.type", "redis"))).isTrue();
        assertThat(RedisRealtimeRelayConfig.isRedisEnabled(new MockEnvironment().withProperty("app.cache.type", "redis"))).isTrue();
        assertThat(RedisRealtimeRelayConfig.isRedisEnabled(new MockEnvironment().withProperty("spring.cache.type", "none"))).isFalse();
        assertThat(RedisRealtimeRelayConfig.isRedisEnabled(new MockEnvironment().withProperty("app.cache.type", "simple"))).isFalse();
        assertThat(RedisRealtimeRelayConfig.isRedisEnabled(new MockEnvironment())).isFalse();

        Clock clock = new SecurityBeansConfig().applicationClock();
        assertThat(clock.millis()).isPositive();
        for (int i = 0; i < 50; i++) {
            assertThat(clock.instant().getNano() % 1_000)
                    .as("Clock must align to PostgreSQL TIMESTAMPTZ microsecond resolution")
                    .isZero();
        }
    }

    private static ChatRealtimeEvent sampleChatEvent(UUID channelId, UUID actorId) {
        return new ChatRealtimeEvent(
                "TYPING",
                null,
                channelId,
                actorId,
                "Nguyễn Văn A",
                null,
                null,
                List.of(),
                OffsetDateTime.ofInstant(Instant.parse("2026-11-26T17:00:00.123456Z"), ZoneOffset.UTC)
        );
    }

    private static NotificationRealtimeEvent sampleNotificationEvent(UUID userId) {
        OffsetDateTime ts = OffsetDateTime.ofInstant(Instant.parse("2026-11-26T17:00:00.123456Z"), ZoneOffset.UTC);
        return new NotificationRealtimeEvent(
                "NOTIFICATION_CREATED",
                userId,
                new NotificationResponse(UUID.randomUUID(), "Title", "Message", false, "EVENT", UUID.randomUUID(), null, ts),
                3L,
                ts
        );
    }
}
