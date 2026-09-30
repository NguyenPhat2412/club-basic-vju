package com.vju.club.security;

import com.vju.club.config.RateLimitProperties;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitServiceTest {

    @Test
    void allowsRequestsUntilLimitAndReportsRemainingQuota() {
        RateLimitService service = service(3, Duration.ofMinutes(1), Clock.systemUTC());

        assertThat(service.check("login:127.0.0.1")).satisfies(decision -> {
            assertThat(decision.allowed()).isTrue();
            assertThat(decision.remaining()).isEqualTo(2);
        });
        assertThat(service.check("login:127.0.0.1").remaining()).isEqualTo(1);
        assertThat(service.check("login:127.0.0.1").remaining()).isEqualTo(0);
        assertThat(service.check("login:127.0.0.1")).satisfies(decision -> {
            assertThat(decision.allowed()).isFalse();
            assertThat(decision.remaining()).isZero();
            assertThat(decision.retryAfterSeconds()).isGreaterThanOrEqualTo(1);
        });
    }

    @Test
    void startsANewWindowAfterTheConfiguredDuration() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        RateLimitService service = service(1, Duration.ofSeconds(10), clock);

        assertThat(service.check("login:127.0.0.1").allowed()).isTrue();
        assertThat(service.check("login:127.0.0.1").allowed()).isFalse();
        clock.advance(Duration.ofSeconds(10));
        assertThat(service.check("login:127.0.0.1").allowed()).isTrue();
    }

    @Test
    void keepsSeparateQuotasForDifferentClientsAndRoutes() {
        RateLimitService service = service(1, Duration.ofMinutes(1), Clock.systemUTC());

        assertThat(service.check("login:10.0.0.1").allowed()).isTrue();
        assertThat(service.check("login:10.0.0.1").allowed()).isFalse();
        assertThat(service.check("login:10.0.0.2").allowed()).isTrue();
        assertThat(service.check("refresh:10.0.0.1").allowed()).isTrue();
    }

    @Test
    void disabledRateLimitAlwaysAllowsRequests() {
        RateLimitProperties properties = properties(1, Duration.ofMinutes(1));
        properties.setEnabled(false);
        RateLimitService service = new RateLimitService(properties, Clock.systemUTC());

        assertThat(service.check("login:127.0.0.1").allowed()).isTrue();
        assertThat(service.check("login:127.0.0.1").allowed()).isTrue();
    }

    @Test
    void concurrentRequestsCannotExceedTheQuota() throws Exception {
        int limit = 10;
        RateLimitService service = service(limit, Duration.ofMinutes(1), Clock.systemUTC());
        var pool = Executors.newFixedThreadPool(32);
        var start = new CountDownLatch(1);
        try {
            List<Callable<RateLimitDecision>> tasks = java.util.stream.IntStream.range(0, 100)
                    .<Callable<RateLimitDecision>>mapToObj(index -> () -> {
                        start.await();
                        return service.check("login:127.0.0.1");
                    }).toList();
            var futures = tasks.stream().map(pool::submit).toList();
            start.countDown();
            long allowed = 0;
            for (var future : futures) {
                if (future.get().allowed()) allowed++;
            }
            assertThat(allowed).isEqualTo(limit);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void forgetsClientsWhoseWindowHasExpired() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        RateLimitService service = service(5, Duration.ofSeconds(10), clock);
        for (int i = 0; i < 100; i++) {
            service.check("login:10.0.0." + i);
        }
        assertThat(service.trackedKeys()).isEqualTo(100);

        clock.advance(Duration.ofSeconds(11));
        service.check("login:10.1.0.1");

        assertThat(service.trackedKeys()).isEqualTo(1);
    }

    @Test
    void keepsClientsWhoseWindowIsStillOpenDuringSweep() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        RateLimitService service = service(1, Duration.ofSeconds(10), clock);
        service.check("login:old");
        clock.advance(Duration.ofSeconds(6));
        service.check("login:recent");
        clock.advance(Duration.ofSeconds(5));

        assertThat(service.check("login:recent").allowed()).isFalse();
        assertThat(service.trackedKeys()).isEqualTo(1);
    }

    private RateLimitService service(int limit, Duration window, Clock clock) {
        return new RateLimitService(properties(limit, window), clock);
    }

    private RateLimitProperties properties(int limit, Duration window) {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setEnabled(true);
        properties.setMaxRequests(limit);
        properties.setWindow(window);
        return properties;
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
