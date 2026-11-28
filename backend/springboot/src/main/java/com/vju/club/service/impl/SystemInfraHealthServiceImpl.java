package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.SettingConstants;
import com.vju.club.config.RuntimeIntegrationConfig;
import com.vju.club.dto.response.SystemInfraHealthResponse;
import com.vju.club.enums.UserStatus;
import com.vju.club.repository.ChatMessageAttachmentRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DocumentVersionRepository;
import com.vju.club.repository.SystemSettingsRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.SystemInfraHealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SystemInfraHealthServiceImpl implements SystemInfraHealthService {
    private final JdbcTemplate jdbcTemplate;
    private final DocumentVersionRepository documentVersionRepository;
    private final ChatMessageAttachmentRepository chatAttachmentRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;
    private final SystemSettingsRepository systemSettingsRepository;
    private final RuntimeIntegrationConfig runtimeIntegrationConfig;
    private final Clock clock;

    @Autowired(required = false)
    private RedisConnectionFactory redisConnectionFactory;

    @Value("${app.storage.type:local}")
    private String storageType;

    @Value("${app.storage.r2.bucket:}")
    private String r2Bucket;

    @Value("${app.cache.type:simple}")
    private String cacheType;

    @Value("${app.mail.smtp-host:}")
    private String envSmtpHost;

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(SettingConstants.PERMISSION_VIEW)
    public SystemInfraHealthResponse inspect(Actor actor) {
        List<SystemInfraHealthResponse.ServiceStatusItem> services = new ArrayList<>();
        services.add(probePostgres());
        services.add(probeRedis());
        services.add(probeStorage());
        services.add(probeSmtp());
        services.add(probeAi());
        services.add(probeTelegram());

        long docBytes = Math.max(0L, documentVersionRepository.sumAllLiveSizeBytes());
        long chatBytes = Math.max(0L, chatAttachmentRepository.sumAllSizeBytes());
        long clubCount = clubRepository.count();
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);

        return new SystemInfraHealthResponse(
                OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC),
                services,
                new SystemInfraHealthResponse.StorageSummary(
                        storageType == null ? "local" : storageType,
                        docBytes,
                        chatBytes,
                        docBytes + chatBytes,
                        clubCount,
                        totalUsers,
                        activeUsers));
    }

    private SystemInfraHealthResponse.ServiceStatusItem probePostgres() {
        long t0 = System.nanoTime();
        try {
            Integer val = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            return new SystemInfraHealthResponse.ServiceStatusItem(
                    "postgres", "PostgreSQL", val != null && val == 1 ? "UP" : "DOWN", ms, "JDBC pool");
        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            return new SystemInfraHealthResponse.ServiceStatusItem("postgres", "PostgreSQL", "DOWN", ms, e.getMessage());
        }
    }

    private SystemInfraHealthResponse.ServiceStatusItem probeRedis() {
        if (!"redis".equalsIgnoreCase(cacheType) || redisConnectionFactory == null) {
            return new SystemInfraHealthResponse.ServiceStatusItem(
                    "redis", "Redis", "UNCONFIGURED", null, "cache=" + (cacheType == null ? "simple" : cacheType));
        }
        long t0 = System.nanoTime();
        try (RedisConnection conn = redisConnectionFactory.getConnection()) {
            String pong = conn.ping();
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            return new SystemInfraHealthResponse.ServiceStatusItem(
                    "redis", "Redis", pong != null ? "UP" : "DOWN", ms, "Pub/Sub + Cache");
        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            return new SystemInfraHealthResponse.ServiceStatusItem("redis", "Redis", "DOWN", ms, e.getMessage());
        }
    }

    private SystemInfraHealthResponse.ServiceStatusItem probeStorage() {
        String mode = storageType == null ? "local" : storageType.trim().toLowerCase();
        if ("r2".equals(mode)) {
            boolean ok = r2Bucket != null && !r2Bucket.isBlank();
            return new SystemInfraHealthResponse.ServiceStatusItem(
                    "storage", "Storage (R2)", ok ? "UP" : "UNCONFIGURED", null, ok ? r2Bucket : "missing bucket");
        }
        return new SystemInfraHealthResponse.ServiceStatusItem(
                "storage", "Storage (" + mode + ")", "UP", null, mode);
    }

    private SystemInfraHealthResponse.ServiceStatusItem probeSmtp() {
        String dbHost = systemSettingsRepository.findSingleton().map(s -> s.getSmtpHost()).orElse(null);
        String effective = (dbHost != null && !dbHost.isBlank()) ? dbHost.trim()
                : (envSmtpHost != null && !envSmtpHost.isBlank() ? envSmtpHost.trim() : null);
        return new SystemInfraHealthResponse.ServiceStatusItem(
                "smtp", "SMTP Mail", effective != null ? "UP" : "UNCONFIGURED", null, effective);
    }

    private SystemInfraHealthResponse.ServiceStatusItem probeAi() {
        var ai = runtimeIntegrationConfig.ai();
        return new SystemInfraHealthResponse.ServiceStatusItem(
                "ai", "AI Gateway", ai.isConfigured() ? "UP" : "UNCONFIGURED", null, ai.isConfigured() ? ai.model() : null);
    }

    private SystemInfraHealthResponse.ServiceStatusItem probeTelegram() {
        var tg = runtimeIntegrationConfig.telegram();
        String status = tg.isActive() ? "UP" : (tg.isConfigured() ? "PAUSED" : "UNCONFIGURED");
        return new SystemInfraHealthResponse.ServiceStatusItem(
                "telegram", "Telegram Bot", status, null, tg.isConfigured() ? tg.chatId() : null);
    }
}
