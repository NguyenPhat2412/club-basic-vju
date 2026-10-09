package com.vju.club.modules.notification.entity;

import lombok.Getter;
import lombok.Setter;
import com.vju.club.common.entity.TimestampedEntity;
import com.vju.club.modules.user.entity.User;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
public class Notification extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 2000) private String message;
    @Column(nullable = false) private boolean read;
    @Column(name = "reference_id") private UUID referenceId;
}
