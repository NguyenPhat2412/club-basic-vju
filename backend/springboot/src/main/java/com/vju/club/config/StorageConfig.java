package com.vju.club.config;

import com.vju.club.modules.document.storage.DocumentStorage;
import com.vju.club.modules.document.storage.LocalDocumentStorage;
import com.vju.club.modules.document.storage.R2DocumentStorage;
import com.vju.club.modules.document.storage.RedisCachedDocumentStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class StorageConfig {
    @Bean
    DocumentStorage documentStorage(
            StorageProperties properties,
            RedisConnectionFactory redisConnectionFactory,
            @Value("${app.cache.type:simple}") String cacheType,
            @Value("${app.cache.asset-max-bytes:2097152}") long assetMaxBytes,
            @Value("${app.cache.asset-ttl:6h}") Duration assetTtl) {
        DocumentStorage base = switch (properties.getType()) {
            case LOCAL -> new LocalDocumentStorage(properties.getLocal().getRoot());
            case R2 -> R2DocumentStorage.create(properties.getR2());
        };
        if ("redis".equalsIgnoreCase(cacheType.strip())) {
            return new RedisCachedDocumentStorage(base, redisConnectionFactory, assetMaxBytes, assetTtl);
        }
        return base;
    }
}
