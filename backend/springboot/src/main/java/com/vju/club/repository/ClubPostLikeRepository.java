package com.vju.club.repository;

import com.vju.club.entity.ClubPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ClubPostLikeRepository extends JpaRepository<ClubPostLike, ClubPostLike.Key> {
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);

    void deleteByPostIdAndUserId(UUID postId, UUID userId);

    int countByPostId(UUID postId);

    @Query("SELECT l.postId FROM ClubPostLike l WHERE l.userId = :userId AND l.postId IN :postIds")
    List<UUID> findLikedPostIds(@Param("userId") UUID userId, @Param("postIds") Collection<UUID> postIds);
}
