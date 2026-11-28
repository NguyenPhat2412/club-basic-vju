package com.vju.club.service;

import com.vju.club.dto.request.BlockIpRequest;
import com.vju.club.dto.response.BlockedIpResponse;
import com.vju.club.entity.BlockedIp;
import com.vju.club.enums.AuditAction;
import com.vju.club.repository.BlockedIpRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.impl.IpBlocklistServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.vju.club.support.ApiErrors.assertApiError;
import static com.vju.club.support.PermissionChecks.withPermissionChecks;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IpBlocklistServiceTest {
    @Mock BlockedIpRepository blockedIpRepository;
    @Mock UserRepository userRepository;
    @Mock AuditService auditService;
    @Mock PermissionAuthorizationService authorization;

    private final Clock fixedClock = Clock.fixed(Instant.parse("2026-11-28T03:00:00Z"), ZoneOffset.UTC);
    private IpBlocklistService service;

    @BeforeEach
    void setUp() {
        service = withPermissionChecks(
                new IpBlocklistServiceImpl(blockedIpRepository, userRepository, auditService, fixedClock),
                authorization);
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void blockIpPreventsBlockingOwnIpAndRecordsAuditForAttackerIp() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("CF-Connecting-IP", "198.51.100.10");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(req));

        Actor admin = new Actor(UUID.randomUUID());
        assertApiError(() -> service.blockIp(admin, new BlockIpRequest("198.51.100.10", "self", 24)),
                HttpStatus.BAD_REQUEST, "CANNOT_BLOCK_OWN_IP");

        when(blockedIpRepository.findByIpAddress("203.0.113.77")).thenReturn(Optional.empty());
        when(blockedIpRepository.saveAndFlush(any(BlockedIp.class))).thenAnswer(inv -> {
            BlockedIp b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            b.setCreatedAt(OffsetDateTime.ofInstant(fixedClock.instant(), ZoneOffset.UTC));
            return b;
        });
        when(userRepository.findById(admin.id())).thenReturn(Optional.empty());

        BlockedIpResponse saved = service.blockIp(admin, new BlockIpRequest("203.0.113.77", "Brute force", 24));
        assertThat(saved.ipAddress()).isEqualTo("203.0.113.77");
        assertThat(saved.expiresAt()).isEqualTo(OffsetDateTime.parse("2026-11-29T03:00:00Z"));
        verify(auditService).record(eq(admin.id()), eq(AuditAction.SECURITY_IP_BLOCKED), eq(saved.id()), eq(null), eq(null), any());

        BlockedIp activeRow = new BlockedIp();
        activeRow.setIpAddress("203.0.113.77");
        activeRow.setExpiresAt(saved.expiresAt());
        when(blockedIpRepository.findActive(any())).thenReturn(List.of(activeRow));

        assertThat(service.isBlocked("203.0.113.77")).isTrue();
        assertThat(service.isBlocked("198.51.100.10")).isFalse();
    }
}
