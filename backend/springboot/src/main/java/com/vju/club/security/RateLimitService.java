package com.vju.club.security;

import com.vju.club.config.RateLimitProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class RateLimitService {
    private static final Logger log = LoggerFactory.getLogger(RateLimitService.class);
    private static final int MAX_TRACKED_KEYS = 10_000;
    private static final String REDIS_KEY_PREFIX = "vju:rl:";

    private final RateLimitProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong lastSweepAt = new AtomicLong();

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    @Value("${app.cache.type:simple}")
    private String cacheType = "simple";

    @Autowired
    public RateLimitService(RateLimitProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    RateLimitService(RateLimitProperties properties, Clock clock, StringRedisTemplate redisTemplate, String cacheType) {
        this.properties = properties;
        this.clock = clock;
        this.redisTemplate = redisTemplate;
        this.cacheType = cacheType == null ? "simple" : cacheType;
    }

    public RateLimitDecision check(String key) {
        return check(key, limit(), properties.getWindow());
    }

    public RateLimitDecision checkWrite(UUID userId) {
        return check("write:" + userId, writeLimit(), properties.getWriteWindow());
    }

    public RateLimitDecision checkChatUpload(UUID userId) {
        return check("chat-upload:" + userId, chatUploadLimit(), properties.getChatUploadWindow());
    }

    public RateLimitDecision check(String key, int maxRequests, Duration windowDuration) {
        int effectiveLimit = Math.max(1, maxRequests);
        if (!properties.isEnabled() || maxRequests <= 0 || windowDuration == null || windowDuration.isZero() || windowDuration.isNegative()) {
            return new RateLimitDecision(true, effectiveLimit, 0);
        }

        long nowMillis = clock.millis();
        long windowMillis = Math.max(1, windowDuration.toMillis());
        if (isRedisEnabled()) {
            try {
                return checkWithRedis(key, effectiveLimit, nowMillis, windowMillis);
            } catch (RuntimeException ex) {
                log.warn("Redis rate limit failed for key {}, falling back to local memory: {}", key, ex.getMessage());
            }
        }
        return checkLocal(key, effectiveLimit, nowMillis, windowMillis);
    }

    private boolean isRedisEnabled() {
        return redisTemplate != null && cacheType != null && "redis".equalsIgnoreCase(cacheType.strip());
    }

    private RateLimitDecision checkWithRedis(String key, int effectiveLimit, long nowMillis, long windowMillis) {
        long bucket = nowMillis / windowMillis;
        String redisKey = REDIS_KEY_PREFIX + key + ":" + bucket;
        Long count = redisTemplate.opsForValue().increment(redisKey);
        if (count == null) {
            throw new IllegalStateException("Redis INCR returned null for key " + redisKey);
        }
        if (count == 1L) {
            redisTemplate.expire(redisKey, Duration.ofMillis(windowMillis));
        }
        if (count > effectiveLimit) {
            long windowEndMillis = (bucket + 1L) * windowMillis;
            long remainingMillis = Math.max(1L, windowEndMillis - nowMillis);
            long retryAfterSeconds = Math.max(1L, (remainingMillis + 999L) / 1000L);
            return new RateLimitDecision(false, 0, retryAfterSeconds);
        }
        return new RateLimitDecision(true, effectiveLimit - count, 0);
    }

    private RateLimitDecision checkLocal(String key, int effectiveLimit, long nowMillis, long windowMillis) {
        sweepExpired(nowMillis, windowMillis);
        if (windows.size() >= MAX_TRACKED_KEYS && !windows.containsKey(key)) {
            windows.entrySet().removeIf(entry -> nowMillis - entry.getValue().startedAt >= entry.getValue().windowMillis);
            if (windows.size() >= MAX_TRACKED_KEYS) {
                return new RateLimitDecision(false, 0, Math.max(1, (windowMillis + 999) / 1000));
            }
        }
        RateLimitDecision[] decisionHolder = new RateLimitDecision[1];
        windows.compute(key, (ignored, existing) -> {
            long now = clock.millis();
            Window window = existing;
            if (window == null || now < window.startedAt || now - window.startedAt >= windowMillis || window.windowMillis != windowMillis) {
                window = new Window(now, windowMillis);
            }
            if (window.count >= effectiveLimit) {
                long retryAfter = Math.max(1, (window.startedAt + windowMillis - now + 999) / 1000);
                decisionHolder[0] = new RateLimitDecision(false, 0, retryAfter);
                return window;
            }
            window.count++;
            decisionHolder[0] = new RateLimitDecision(true, effectiveLimit - window.count, 0);
            return window;
        });
        return decisionHolder[0];
    }

    private void sweepExpired(long now, long minSweepIntervalMillis) {
        long last = lastSweepAt.get();
        if (now - last < minSweepIntervalMillis || !lastSweepAt.compareAndSet(last, now)) {
            return;
        }
        windows.entrySet().removeIf(entry -> now - entry.getValue().startedAt >= entry.getValue().windowMillis);
    }

    int trackedKeys() {
        return windows.size();
    }

    public int limit() {
        return Math.max(1, properties.getMaxRequests());
    }

    public int writeLimit() {
        return Math.max(1, properties.getWriteMaxRequests());
    }

    public int chatUploadLimit() {
        return Math.max(1, properties.getChatUploadMaxRequests());
    }

    private static final class Window {
        private final long startedAt;
        private final long windowMillis;
        private int count;

        private Window(long startedAt, long windowMillis) {
            this.startedAt = startedAt;
            this.windowMillis = windowMillis;
        }
    }
}
