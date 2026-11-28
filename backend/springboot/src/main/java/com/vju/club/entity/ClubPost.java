package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "club_posts")
@Getter
@Setter
@NoArgsConstructor
public class ClubPost {
    @Id
    private UUID id;

    @Column(name = "club_id", nullable = false)
    private UUID clubId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "title", length = 160)
    private String title;

    @Column(name = "content", nullable = false, length = 4000)
    private String content;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "pinned", nullable = false)
    private boolean pinned = false;

    @Column(name = "likes_count", nullable = false)
    private int likesCount = 0;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}
