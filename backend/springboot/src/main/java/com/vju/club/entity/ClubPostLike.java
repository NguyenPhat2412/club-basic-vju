package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "club_post_likes")
@IdClass(ClubPostLike.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class ClubPostLike {
    @Id
    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public ClubPostLike(UUID postId, UUID userId) {
        this.postId = postId;
        this.userId = userId;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private UUID postId;
        private UUID userId;
    }
}
