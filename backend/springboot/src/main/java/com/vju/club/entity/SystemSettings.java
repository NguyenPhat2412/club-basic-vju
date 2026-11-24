package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** The single row of system-wide limits. 0 means "no limit" for the counts and "no wait" for the cooldown. */
@Entity
@Table(name = "system_settings")
@Getter
@Setter
public class SystemSettings extends TimestampedEntity {
    @Column(name = "max_pending_applications", nullable = false)
    private int maxPendingApplications;

    @Column(name = "reapply_cooldown_days", nullable = false)
    private int reapplyCooldownDays;

    @Column(name = "max_active_clubs", nullable = false)
    private int maxActiveClubs = 5;

    @Column(name = "attendance_edit_window_hours", nullable = false)
    private int attendanceEditWindowHours = 48;

    @Column(name = "allow_self_registration", nullable = false)
    private boolean allowSelfRegistration = true;

    @Column(name = "attendance_opens_before_minutes", nullable = false)
    private int attendanceOpensBeforeMinutes = 120;

    @Column(name = "event_task_grace_days", nullable = false)
    private int eventTaskGraceDays = 7;

    @Column(name = "chat_summaries_per_hour", nullable = false)
    private int chatSummariesPerHour = 10;

    @Column(name = "chat_max_message_length", nullable = false)
    private int chatMaxMessageLength = 4000;

    @Column(name = "chat_messages_per_minute", nullable = false)
    private int chatMessagesPerMinute = 20;

    @Column(name = "document_max_file_mb", nullable = false)
    private int documentMaxFileMb = 20;

    @Column(name = "club_image_max_mb", nullable = false)
    private int clubImageMaxMb = 10;

    @Column(name = "avatar_max_mb", nullable = false)
    private int avatarMaxMb = 5;

    @Column(name = "club_storage_quota_mb", nullable = false)
    private int clubStorageQuotaMb = 500;

    @Column(name = "document_max_versions", nullable = false)
    private int documentMaxVersions = 20;

    @Column(name = "max_channels_per_club", nullable = false)
    private int maxChannelsPerClub = 30;

    @Column(name = "max_departments_per_club", nullable = false)
    private int maxDepartmentsPerClub = 20;

    @Column(name = "max_active_events_per_club", nullable = false)
    private int maxActiveEventsPerClub = 50;

    @Column(name = "max_open_tasks_per_club", nullable = false)
    private int maxOpenTasksPerClub = 200;

    @Column(name = "broadcast_cooldown_minutes", nullable = false)
    private int broadcastCooldownMinutes = 5;

    @Column(name = "facebook_sync_cooldown_minutes", nullable = false)
    private int facebookSyncCooldownMinutes = 2;

    @Column(name = "facebook_auto_sync_enabled", nullable = false)
    private boolean facebookAutoSyncEnabled = true;

    @Column(name = "facebook_auto_sync_interval_minutes", nullable = false)
    private int facebookAutoSyncIntervalMinutes = 60;

    @Column(name = "otp_expiry_minutes", nullable = false)
    private int otpExpiryMinutes = 5;

    @Column(name = "otp_max_send_count", nullable = false)
    private int otpMaxSendCount = 5;

    @Column(name = "otp_resend_cooldown_seconds", nullable = false)
    private int otpResendCooldownSeconds = 60;

    @Column(name = "otp_max_verify_attempts", nullable = false)
    private int otpMaxVerifyAttempts = 5;

    @Column(name = "smtp_host", length = 255)
    private String smtpHost;

    @Column(name = "smtp_port", nullable = false)
    private int smtpPort = 587;

    @Column(name = "smtp_username", length = 255)
    private String smtpUsername;

    @Column(name = "smtp_password", length = 500)
    private String smtpPassword;

    @Column(name = "smtp_from_email", length = 320)
    private String smtpFromEmail;

    @Column(name = "smtp_from_name", nullable = false, length = 120)
    private String smtpFromName = "VJU ClubHub";

    @Column(name = "smtp_start_tls", nullable = false)
    private boolean smtpStartTls = true;

    @Column(name = "facebook_app_id", length = 64)
    private String facebookAppId;

    @Column(name = "facebook_app_secret", length = 512)
    private String facebookAppSecret;

    @Column(name = "facebook_graph_version", length = 32)
    private String facebookGraphVersion;

    @Column(name = "facebook_oauth_redirect_uri", length = 500)
    private String facebookOauthRedirectUri;

    @Column(name = "frontend_base_url", length = 500)
    private String frontendBaseUrl;

    @Column(name = "ai_base_url", length = 500)
    private String aiBaseUrl;

    @Column(name = "ai_api_key", length = 512)
    private String aiApiKey;

    @Column(name = "ai_model", length = 120)
    private String aiModel;

    @Column(name = "google_client_id", length = 255)
    private String googleClientId;

    @Column(name = "google_allowed_domains", length = 500)
    private String googleAllowedDomains;

    @Column(name = "google_create_accounts")
    private Boolean googleCreateAccounts;
}
