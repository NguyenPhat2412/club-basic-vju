package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.util.UUID;

/** One business action: who did what to which resource, with JSON snapshots before and after. */
@Entity
@Immutable
@Table(name = "audit_logs")
public class AuditLog extends CreatedEntity {

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(nullable = false, length = 64)
    private String action;

    @Column(name = "resource_type", nullable = false, length = 32)
    private String resourceType;

    @Column(name = "resource_id", nullable = false)
    private UUID resourceId;

    @Column(name = "club_id")
    private UUID clubId;

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value")
    private String newValue;

    protected AuditLog() { }

    public AuditLog(UUID actorUserId, String action, String resourceType, UUID resourceId, UUID clubId,
                    String oldValue, String newValue) {
        this.actorUserId = actorUserId;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.clubId = clubId;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    public UUID getActorUserId() { return actorUserId; }
    public String getAction() { return action; }
    public String getResourceType() { return resourceType; }
    public UUID getResourceId() { return resourceId; }
    public UUID getClubId() { return clubId; }
    public String getOldValue() { return oldValue; }
    public String getNewValue() { return newValue; }
}
