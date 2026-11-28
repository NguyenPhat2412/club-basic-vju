package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.SettingConstants;
import com.vju.club.dto.request.BlockIpRequest;
import com.vju.club.dto.response.BlockedIpResponse;
import com.vju.club.entity.BlockedIp;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.error.ApiException;
import com.vju.club.repository.BlockedIpRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.RequestMetadataExtractor;
import com.vju.club.service.AuditService;
import com.vju.club.service.IpBlocklistService;
import com.vju.club.service.SecurityTelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class IpBlocklistServiceImpl implements IpBlocklistService {
    private static final long CACHE_TTL_SECONDS = 10;

    private final BlockedIpRepository blockedIpRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final Clock clock;

    @Autowired(required = false)
    private SecurityTelemetryService securityTelemetryService;

    private final AtomicReference<Instant> cacheLoadedAt = new AtomicReference<>(Instant.EPOCH);
    private volatile Map<String, OffsetDateTime> activeCache = Map.of();

    @Override
    public boolean isBlocked(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return false;
        String normalized = ipAddress.trim();
        refreshCacheIfStale();
        if (!activeCache.containsKey(normalized)) {
            return false;
        }
        OffsetDateTime expiresAt = activeCache.get(normalized);
        return expiresAt == null || expiresAt.toInstant().isAfter(clock.instant());
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(SettingConstants.PERMISSION_VIEW)
    public List<BlockedIpResponse> listActive(Actor actor) {
        OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        List<BlockedIp> active = blockedIpRepository.findActive(now);
        Set<UUID> actorIds = new LinkedHashSet<>();
        active.forEach(b -> {
            if (b.getBlockedBy() != null) actorIds.add(b.getBlockedBy());
        });
        Map<UUID, User> users = new HashMap<>();
        if (!actorIds.isEmpty()) {
            userRepository.findAllById(actorIds).forEach(u -> users.put(u.getId(), u));
        }
        return active.stream()
                .map(b -> toResponse(b, b.getBlockedBy() == null ? null : users.get(b.getBlockedBy())))
                .toList();
    }

    @Override
    @Transactional
    @RequirePermission(SettingConstants.PERMISSION_UPDATE)
    public BlockedIpResponse blockIp(Actor actor, BlockIpRequest request) {
        String ip = request.ipAddress().trim();
        if (ip.isEmpty() || ip.contains(" ")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_IP_ADDRESS", "IP address format is invalid");
        }
        String callerIp = RequestMetadataExtractor.extractCurrent().ipAddress();
        if (callerIp != null && callerIp.equalsIgnoreCase(ip)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_BLOCK_OWN_IP",
                    "You cannot block your own current IP address");
        }
        OffsetDateTime now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        OffsetDateTime expiresAt = (request.durationHours() != null && request.durationHours() > 0)
                ? now.plusHours(request.durationHours())
                : null;
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().trim();

        BlockedIp entity = blockedIpRepository.findByIpAddress(ip).orElseGet(BlockedIp::new);
        entity.setIpAddress(ip);
        entity.setReason(reason);
        entity.setBlockedBy(actor.id());
        entity.setExpiresAt(expiresAt);
        BlockedIp saved = blockedIpRepository.saveAndFlush(entity);
        invalidateCache();

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("ipAddress", ip);
        if (reason != null) auditValues.put("reason", reason);
        if (expiresAt != null) auditValues.put("expiresAt", expiresAt.toString());
        auditService.record(actor.id(), AuditAction.SECURITY_IP_BLOCKED, saved.getId(), null, null, auditValues);
        notifyTelegram(actor.id(), "Chặn địa chỉ IP " + ip + (expiresAt == null ? " (vĩnh viễn)" : " đến " + expiresAt));

        User blocker = userRepository.findById(actor.id()).orElse(null);
        return toResponse(saved, blocker);
    }

    @Override
    @Transactional
    @RequirePermission(SettingConstants.PERMISSION_UPDATE)
    public void unblockIp(Actor actor, UUID ipId) {
        BlockedIp existing = blockedIpRepository.findById(ipId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "BLOCKED_IP_NOT_FOUND", "Blocked IP entry not found"));
        String ip = existing.getIpAddress();
        blockedIpRepository.delete(existing);
        blockedIpRepository.flush();
        invalidateCache();

        auditService.record(actor.id(), AuditAction.SECURITY_IP_UNBLOCKED, ipId, null, Map.of("ipAddress", ip), null);
        notifyTelegram(actor.id(), "Gỡ chặn địa chỉ IP " + ip);
    }

    private void refreshCacheIfStale() {
        Instant now = clock.instant();
        Instant loaded = cacheLoadedAt.get();
        if (loaded.plusSeconds(CACHE_TTL_SECONDS).isAfter(now)) {
            return;
        }
        if (cacheLoadedAt.compareAndSet(loaded, now)) {
            try {
                OffsetDateTime nowUtc = OffsetDateTime.ofInstant(now, ZoneOffset.UTC);
                List<BlockedIp> rows = blockedIpRepository.findActive(nowUtc);
                Map<String, OffsetDateTime> next = new ConcurrentHashMap<>();
                for (BlockedIp row : rows) {
                    next.put(row.getIpAddress(), row.getExpiresAt() == null ? OffsetDateTime.MAX : row.getExpiresAt());
                }
                activeCache = next;
            } catch (RuntimeException ignored) {
                cacheLoadedAt.set(Instant.EPOCH);
            }
        }
    }

    private void invalidateCache() {
        cacheLoadedAt.set(Instant.EPOCH);
    }

    private void notifyTelegram(UUID actorId, String summary) {
        if (securityTelemetryService == null) return;
        try {
            securityTelemetryService.onSensitiveSettingsChanged(actorId, summary);
        } catch (RuntimeException ignored) {
        }
    }

    private static BlockedIpResponse toResponse(BlockedIp b, User blocker) {
        return new BlockedIpResponse(
                b.getId(),
                b.getIpAddress(),
                b.getReason(),
                b.getBlockedBy(),
                blocker != null ? blocker.getFullName() : null,
                b.getExpiresAt(),
                b.getCreatedAt());
    }
}
