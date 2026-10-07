package com.vju.club.modules.notification.entity;

import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.user.entity.User;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 2000) private String message;
    @Column(nullable = false) private boolean read;
    @Column(name = "reference_id") private UUID referenceId;

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public UUID getReferenceId() { return referenceId; }
    public void setReferenceId(UUID referenceId) { this.referenceId = referenceId; }
}
