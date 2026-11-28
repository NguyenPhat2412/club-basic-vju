package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "notification_campaigns")
@Getter
@Setter
public class NotificationCampaign extends TimestampedEntity {
    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(name = "audience_type", nullable = false, length = 32)
    private String audienceType;

    @Column(name = "target_club_ids")
    private String targetClubIds;

    @Column(nullable = false, length = 32)
    private String category = "SYSTEM";

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "send_email", nullable = false)
    private boolean sendEmail = false;

    @Column(name = "total_recipients", nullable = false)
    private int totalRecipients;

    @Column(name = "delivered_count", nullable = false)
    private int deliveredCount;

    @Column(name = "email_queued_count", nullable = false)
    private int emailQueuedCount;

    @Column(nullable = false, length = 24)
    private String status = "COMPLETED";
}
