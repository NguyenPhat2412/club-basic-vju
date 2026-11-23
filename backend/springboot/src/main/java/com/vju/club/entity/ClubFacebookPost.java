package com.vju.club.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "club_facebook_posts",
        uniqueConstraints = @UniqueConstraint(name = "uq_club_facebook_posts_club_post", columnNames = {"club_id", "fb_post_id"})
)
@Getter
@Setter
public class ClubFacebookPost extends TimestampedEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Column(name = "fb_post_id", nullable = false, length = 150)
    private String fbPostId;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "permalink_url", length = 1500)
    private String permalinkUrl;

    @Column(name = "image_url", length = 2000)
    private String imageUrl;

    @Column(name = "published_at", nullable = false)
    private OffsetDateTime publishedAt;

    @Column(name = "reactions_count", nullable = false)
    private int reactionsCount;

    @Column(name = "comments_count", nullable = false)
    private int commentsCount;

    @Column(name = "shares_count", nullable = false)
    private int sharesCount;

    @Column(name = "synced_at", nullable = false)
    private OffsetDateTime syncedAt;
}
