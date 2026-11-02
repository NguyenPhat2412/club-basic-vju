package com.vju.club.security;

import lombok.RequiredArgsConstructor;
import com.vju.club.config.RateLimitProperties;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class RateLimitService {
    private final RateLimitProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong lastSweepAt = new AtomicLong();

    public RateLimitDecision check(String key) {
        int limit = limit();
        if (!properties.isEnabled()) {
            return new RateLimitDecision(true, limit, 0);
        }

        long windowMillis = Math.max(1, properties.getWindow().toMillis());
        sweepExpired(clock.millis(), windowMillis);
        RateLimitDecision[] decisionHolder = new RateLimitDecision[1];
        windows.compute(key, (ignored, existing) -> {
            long now = clock.millis();
            Window window = existing;
            if (window == null || now < window.startedAt || now - window.startedAt >= windowMillis) {
                window = new Window(now);
            }
            if (window.count >= limit) {
                long retryAfter = Math.max(1, (window.startedAt + windowMillis - now + 999) / 1000);
                decisionHolder[0] = new RateLimitDecision(false, 0, retryAfter);
                return window;
            }
            window.count++;
            decisionHolder[0] = new RateLimitDecision(true, limit - window.count, 0);
            return window;
        });
        return decisionHolder[0];
    }

    private void sweepExpired(long now, long windowMillis) {
        long last = lastSweepAt.get();
        if (now - last < windowMillis || !lastSweepAt.compareAndSet(last, now)) {
            return;
        }
        windows.entrySet().removeIf(entry -> now - entry.getValue().startedAt >= windowMillis);
    }

    int trackedKeys() {
        return windows.size();
    }

    public int limit() {
        return Math.max(1, properties.getMaxRequests());
    }

    private static final class Window {
        private final long startedAt;
        private int count;

        private Window(long startedAt) {
            this.startedAt = startedAt;
        }
    }
}
