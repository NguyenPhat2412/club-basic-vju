package com.vju.club.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * Configures the cross-instance Redis Pub/Sub bridge for STOMP WebSocket realtime events.
 * Activates when {@code spring.cache.type=redis} or {@code app.cache.type=redis}; otherwise
 * falls back cleanly to direct local {@link SimpMessagingTemplate} delivery with zero Redis I/O.
 */
@Configuration
public class RedisRealtimeRelayConfig {
    private static final Logger log = LoggerFactory.getLogger(RedisRealtimeRelayConfig.class);

    static boolean isRedisEnabled(Environment env) {
        if (env == null) return false;
        String springCacheType = env.getProperty("spring.cache.type", "").strip();
        String appCacheType = env.getProperty("app.cache.type", "").strip();
        return "redis".equalsIgnoreCase(springCacheType) || "redis".equalsIgnoreCase(appCacheType);
    }

    @Bean
    public RedisWebSocketRelay redisWebSocketRelay(
            SimpMessagingTemplate messagingTemplate,
            ObjectProvider<RedisConnectionFactory> connectionFactoryProvider,
            Environment environment) {
        if (isRedisEnabled(environment)) {
            RedisConnectionFactory factory = connectionFactoryProvider.getIfAvailable();
            if (factory != null) {
                return new RedisWebSocketRelay(messagingTemplate, new StringRedisTemplate(factory), true);
            }
            log.warn("Redis realtime relay requested but no RedisConnectionFactory bean is available; using local broker");
        }
        return RedisWebSocketRelay.localOnly(messagingTemplate);
    }

    @Bean
    @Conditional(RedisRealtimeCondition.class)
    public RedisMessageListenerContainer realtimeRedisMessageListenerContainer(
            RedisConnectionFactory connectionFactory,
            RedisWebSocketRelay relay) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(relay, ChannelTopic.of(RedisWebSocketRelay.BROADCAST_CHANNEL));
        container.setErrorHandler(err -> log.warn("Redis WebSocket Pub/Sub listener error: {}", err.getMessage()));
        return container;
    }

    static final class RedisRealtimeCondition implements Condition {
        @Override
        public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
            return isRedisEnabled(context.getEnvironment());
        }
    }
}
