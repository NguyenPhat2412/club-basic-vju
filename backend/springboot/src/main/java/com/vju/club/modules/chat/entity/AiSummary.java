package com.vju.club.modules.chat.entity;

import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "ai_summaries")
@Getter
@Setter
public class AiSummary extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "channel_id", nullable = false, updatable = false)
    private ChatChannel channel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false, updatable = false)
    private User requestedBy;

    @Column(name = "message_count", nullable = false)
    private int messageCount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "decisions_json", nullable = false, columnDefinition = "TEXT")
    private String decisionsJson = "[]";

    @Column(name = "suggested_tasks_json", nullable = false, columnDefinition = "TEXT")
    private String suggestedTasksJson = "[]";

    @Column(name = "suggested_events_json", nullable = false, columnDefinition = "TEXT")
    private String suggestedEventsJson = "[]";

    @Column(nullable = false, length = 64)
    private String model;
}
