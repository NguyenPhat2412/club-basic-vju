package com.vju.club.modules.clubapplication.entity;

import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.club.entity.Club;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "club_application_forms")
@Getter
@Setter
public class ClubApplicationForm extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 16)
    private String status = "OPEN";

    @Column(name = "open_at")
    private OffsetDateTime openAt;

    @Column(name = "close_at")
    private OffsetDateTime closeAt;

    @Column(name = "fields_config", nullable = false, columnDefinition = "TEXT")
    private String fieldsConfig = "[]";

    @Column(name = "allow_attachments", nullable = false)
    private boolean allowAttachments = true;

    @Column(name = "require_attachment", nullable = false)
    private boolean requireAttachment = false;

    @Column(name = "max_attachments", nullable = false)
    private int maxAttachments = 5;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = true;
}
