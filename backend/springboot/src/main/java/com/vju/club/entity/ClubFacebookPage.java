package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "club_facebook_pages")
@Getter
@Setter
public class ClubFacebookPage extends TimestampedEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false, unique = true)
    private Club club;

    @Column(name = "page_id", nullable = false, length = 100)
    private String pageId;

    @Column(name = "page_name", nullable = false, length = 255)
    private String pageName;

    @Column(name = "page_link", length = 1000)
    private String pageLink;

    @Column(name = "avatar_url", length = 1500)
    private String avatarUrl;

    @Column(name = "followers_count", nullable = false)
    private int followersCount;

    @Column(name = "fan_count", nullable = false)
    private int fanCount;

    @Column(name = "encrypted_access_token", nullable = false, columnDefinition = "TEXT")
    private String encryptedAccessToken;

    @Column(name = "connected_by")
    private UUID connectedBy;

    @Column(name = "connected_at", nullable = false)
    private OffsetDateTime connectedAt;

    @Column(name = "last_synced_at")
    private OffsetDateTime lastSyncedAt;

    @Column(name = "last_auto_synced_at")
    private OffsetDateTime lastAutoSyncedAt;

    @Column(name = "consecutive_sync_failures", nullable = false)
    private int consecutiveSyncFailures;

    @Column(name = "last_sync_error", columnDefinition = "TEXT")
    private String lastSyncError;
}
