package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.request.BlockIpRequest;
import com.vju.club.dto.request.TestSmtpEmailRequest;
import com.vju.club.dto.request.UpdateSystemSettingsRequest;
import com.vju.club.dto.response.BlockedIpResponse;
import com.vju.club.dto.response.PublicSystemStatusResponse;
import com.vju.club.dto.response.SystemInfraHealthResponse;
import com.vju.club.dto.response.SystemSecurityOverviewResponse;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.security.Actor;
import com.vju.club.service.IpBlocklistService;
import com.vju.club.service.SecurityTelemetryService;
import com.vju.club.service.SystemInfraHealthService;
import com.vju.club.service.SystemSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class SystemSettingsController {
    private final SystemSettingsService service;
    private final SecurityTelemetryService securityTelemetryService;
    private final SystemInfraHealthService infraHealthService;
    private final IpBlocklistService ipBlocklistService;

    @PublicEndpoint
    @GetMapping(ApiPaths.PUBLIC_SYSTEM_STATUS)
    public PublicSystemStatusResponse publicStatus() {
        return service.publicStatus();
    }

    @GetMapping(ApiPaths.SYSTEM_SETTINGS)
    public SystemSettingsResponse get(Actor actor) {
        return service.get(actor);
    }

    @PutMapping(ApiPaths.SYSTEM_SETTINGS)
    public SystemSettingsResponse update(Actor actor, @Valid @RequestBody UpdateSystemSettingsRequest request) {
        return service.update(actor, request);
    }

    @PutMapping(ApiPaths.SYSTEM_SETTINGS_SMTP_TEST)
    public ResponseEntity<Void> testSmtp(Actor actor, @Valid @RequestBody TestSmtpEmailRequest request) {
        service.sendTestEmail(actor, request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(ApiPaths.SYSTEM_SETTINGS_TELEGRAM_TEST)
    public ResponseEntity<Void> testTelegram(Actor actor) {
        service.sendTestTelegram(actor);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(ApiPaths.SYSTEM_SETTINGS_SECURITY_OVERVIEW)
    public SystemSecurityOverviewResponse securityOverview(
            Actor actor,
            @RequestParam(name = "hours", defaultValue = "24") int hours) {
        return securityTelemetryService.getSecurityOverview(actor, hours);
    }

    @DeleteMapping(ApiPaths.SYSTEM_SETTINGS_DISCONNECT_USER)
    public ResponseEntity<Void> disconnectOnlineUser(Actor actor, @PathVariable UUID userId) {
        securityTelemetryService.disconnectOnlineUser(actor, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(ApiPaths.SYSTEM_SETTINGS_INFRA_HEALTH)
    public SystemInfraHealthResponse infraHealth(Actor actor) {
        return infraHealthService.inspect(actor);
    }

    @GetMapping(ApiPaths.SYSTEM_SETTINGS_BLOCKED_IPS)
    public List<BlockedIpResponse> listBlockedIps(Actor actor) {
        return ipBlocklistService.listActive(actor);
    }

    @PostMapping(ApiPaths.SYSTEM_SETTINGS_BLOCKED_IPS)
    public ResponseEntity<BlockedIpResponse> blockIp(Actor actor, @Valid @RequestBody BlockIpRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ipBlocklistService.blockIp(actor, request));
    }

    @DeleteMapping(ApiPaths.SYSTEM_SETTINGS_BLOCKED_IP_BY_ID)
    public ResponseEntity<Void> unblockIp(Actor actor, @PathVariable UUID ipId) {
        ipBlocklistService.unblockIp(actor, ipId);
        return ResponseEntity.noContent().build();
    }
}
