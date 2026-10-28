package com.vju.club.modules.setting.entity;

import com.vju.club.common.entity.TimestampedEntity;
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
}
