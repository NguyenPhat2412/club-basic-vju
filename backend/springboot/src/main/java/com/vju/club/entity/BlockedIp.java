package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "blocked_ips")
@Getter
@Setter
public class BlockedIp extends CreatedEntity {
    @Column(name = "ip_address", nullable = false, unique = true, length = 64)
    private String ipAddress;

    @Column(name = "reason", length = 300)
    private String reason;

    @Column(name = "blocked_by")
    private UUID blockedBy;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;
}
