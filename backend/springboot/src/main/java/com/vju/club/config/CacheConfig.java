package com.vju.club.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {
    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    public static final String CACHE_PUBLIC_CLUBS = "public-clubs";
    public static final String CACHE_PUBLIC_CLUB_DETAIL = "public-club-detail";
    public static final String CACHE_PUBLIC_EVENTS = "public-events";

    @Bean
    public CacheManager cacheManager(
            @Value("${app.cache.type:simple}") String cacheType,
            @Value("${app.cache.ttl:10m}") Duration ttl,
            RedisConnectionFactory redisConnectionFactory) {
        if ("redis".equalsIgnoreCase(cacheType.strip())) {
            RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(ttl)
                    .prefixCacheNameWith("vju:cache:")
                    .disableCachingNullValues();
            return RedisCacheManager.builder(redisConnectionFactory)
                    .cacheDefaults(config)
                    .build();
        }
        return new ConcurrentMapCacheManager(
                CACHE_PUBLIC_CLUBS,
                CACHE_PUBLIC_CLUB_DETAIL,
                CACHE_PUBLIC_EVENTS
        );
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Redis cache GET failed for {}[{}]: {}", cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Redis cache PUT failed for {}[{}]: {}", cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Redis cache EVICT failed for {}[{}]: {}", cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Redis cache CLEAR failed for {}: {}", cache.getName(), exception.getMessage());
            }
        };
    }
}
