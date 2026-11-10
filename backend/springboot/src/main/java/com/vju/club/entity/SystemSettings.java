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
    private int maxActiveClubs;

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

    @Column(name = "document_max_file_mb", nullable = false)
    private int documentMaxFileMb = 20;

    @Column(name = "club_image_max_mb", nullable = false)
    private int clubImageMaxMb = 10;

    @Column(name = "avatar_max_mb", nullable = false)
    private int avatarMaxMb = 5;
}
