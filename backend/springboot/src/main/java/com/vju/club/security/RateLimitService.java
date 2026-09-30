package com.vju.club.security;

import com.vju.club.config.RateLimitProperties;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class RateLimitService {
    private final RateLimitProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong lastSweepAt = new AtomicLong();

    public RateLimitService(RateLimitProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public RateLimitDecision check(String key) {
        int limit = limit();
        if (!properties.isEnabled()) {
            return new RateLimitDecision(true, limit, 0);
        }

        long now = clock.millis();
        long windowMillis = Math.max(1, properties.getWindow().toMillis());
        sweepExpired(now, windowMillis);
        Window window = windows.computeIfAbsent(key, ignored -> new Window(now));
        synchronized (window) {
            if (now < window.startedAt || now - window.startedAt >= windowMillis) {
                window.startedAt = now;
                window.count = 0;
            }
            if (window.count >= limit) {
                long retryAfter = Math.max(1, (window.startedAt + windowMillis - now + 999) / 1000);
                return new RateLimitDecision(false, 0, retryAfter);
            }
            window.count++;
            return new RateLimitDecision(true, limit - window.count, 0);
        }
    }

    /** Drops finished windows at most once per window so the map cannot grow without bound. */
    private void sweepExpired(long now, long windowMillis) {
        long last = lastSweepAt.get();
        if (now - last < windowMillis || !lastSweepAt.compareAndSet(last, now)) {
            return;
        }
        windows.entrySet().removeIf(entry -> {
            synchronized (entry.getValue()) {
                return now - entry.getValue().startedAt >= windowMillis;
            }
        });
    }

    int trackedKeys() {
        return windows.size();
    }

    public int limit() {
        return Math.max(1, properties.getMaxRequests());
    }

    private static final class Window {
        private long startedAt;
        private int count;

        private Window(long startedAt) {
            this.startedAt = startedAt;
        }
    }
}
